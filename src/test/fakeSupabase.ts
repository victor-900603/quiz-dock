import { mockQuestionsBySet, mockSets } from '../data/mock'

export type FakeError = {
  message: string
}

export type FakeRow = Record<string, unknown>

export type FakeTableName = 'quiz_sets' | 'questions'

export type FakeTables = Record<FakeTableName, FakeRow[]>

export type FakeResult = {
  data: unknown
  error: FakeError | null
}

export type FakeSupabase = {
  from: (table: string) => FakeQuery
  reset: (seed?: Partial<FakeTables>) => void
  failNextInsert: (table: FakeTableName, error: FakeError, after?: number) => void
  failNextSelect: (table: FakeTableName, error: FakeError) => void
  failNextAction: (
    table: FakeTableName,
    action: FakeAction,
    error: FakeError,
  ) => void
  consumeInsertFailure: (table: FakeTableName) => FakeError | null
  consumeActionFailure: (table: FakeTableName, action: FakeAction) => FakeError | null
  readonly tables: FakeTables
  readonly insertCounts: Record<FakeTableName, number>
}

export const TEST_OWNER_ID = 'test-user'

type FakeAction = 'select' | 'insert' | 'upsert' | 'update' | 'delete'

type FakeMode = 'single' | 'maybeSingle' | null

function emptyTables(): FakeTables {
  return { quiz_sets: [], questions: [] }
}

function cloneTables(tables: FakeTables): FakeTables {
  return {
    quiz_sets: tables.quiz_sets.map((row) => ({ ...row })),
    questions: tables.questions.map((row) => ({ ...row })),
  }
}

let nextFakeId = 0

function fakeId(): string {
  nextFakeId += 1
  return `fake-${nextFakeId}`
}

function asRows(value: unknown): FakeRow[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is FakeRow => typeof item === 'object' && item !== null,
    )
  }

  if (typeof value === 'object' && value !== null) {
    return [value as FakeRow]
  }

  return []
}

function compareRows(
  left: FakeRow,
  right: FakeRow,
  column: string,
  ascending: boolean,
): number {
  const leftValue = left[column]
  const rightValue = right[column]

  if (leftValue === rightValue) return 0
  if (leftValue == null) return 1
  if (rightValue == null) return -1

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return ascending ? leftValue - rightValue : rightValue - leftValue
  }

  return ascending
    ? String(leftValue).localeCompare(String(rightValue))
    : String(rightValue).localeCompare(String(leftValue))
}

export class FakeQuery implements PromiseLike<FakeResult> {
  private owner: FakeSupabase
  private table: FakeTableName
  private action: FakeAction = 'select'
  private filters: Array<[string, unknown]> = []
  private orders: Array<[string, boolean]> = []
  private limitCount: number | null = null
  private rangeStart: number | null = null
  private rangeEnd: number | null = null
  private mode: FakeMode = null
  private values: unknown = null
  private conflictColumns: string[] = []
  private ignoreDuplicates = false

  constructor(owner: FakeSupabase, table: FakeTableName) {
    this.owner = owner
    this.table = table
  }

  select(): this {
    return this
  }

  insert(values: unknown): this {
    this.action = 'insert'
    this.values = values
    return this
  }

  upsert(
    values: unknown,
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.action = 'upsert'
    this.values = values
    this.conflictColumns = (options?.onConflict ?? '').split(',').filter(Boolean)
    this.ignoreDuplicates = options?.ignoreDuplicates ?? false
    return this
  }

  update(values: unknown): this {
    this.action = 'update'
    this.values = values
    return this
  }

  delete(): this {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push([column, value])
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push([column, options?.ascending ?? true])
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  range(from: number, to: number): this {
    this.rangeStart = from
    this.rangeEnd = to
    return this
  }

  single(): this {
    this.mode = 'single'
    return this
  }

  maybeSingle(): this {
    this.mode = 'maybeSingle'
    return this
  }

  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private matches(row: FakeRow): boolean {
    return this.filters.every(([column, value]) => row[column] === value)
  }

  private execute(): FakeResult {
    const actionFailure = this.owner.consumeActionFailure(this.table, this.action)
    if (actionFailure) return { data: null, error: actionFailure }

    const table = this.owner.tables[this.table]
    const matching = table.filter((row) => this.matches(row))
    let result: FakeRow[]

    if (this.action === 'insert' || this.action === 'upsert') {
      const failure = this.owner.consumeInsertFailure(this.table)
      if (failure) return { data: null, error: failure }

      result = this.applyWrite(table)
    } else if (this.action === 'update') {
      result = matching
      for (const row of matching) {
        Object.assign(row, this.values, { updated_at: new Date().toISOString() })
      }
    } else if (this.action === 'delete') {
      result = matching
      const deletedIds = new Set(
        matching.map((row) => row.id).filter((id): id is string => typeof id === 'string'),
      )
      this.owner.tables[this.table] = table.filter((row) => !matching.includes(row))

      if (this.table === 'quiz_sets') {
        this.owner.tables.questions = this.owner.tables.questions.filter(
          (row) => !deletedIds.has(String(row.set_id)),
        )
      }
    } else {
      result = matching
    }

    for (const [column, ascending] of [...this.orders].reverse()) {
      result = [...result].sort((left, right) =>
        compareRows(left, right, column, ascending),
      )
    }

    if (this.rangeStart !== null && this.rangeEnd !== null) {
      result = result.slice(this.rangeStart, this.rangeEnd + 1)
    }

    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount)
    }

    if (this.mode) {
      return { data: result[0] ?? null, error: null }
    }

    return { data: result, error: null }
  }

  private applyWrite(table: FakeRow[]): FakeRow[] {
    const rows = asRows(this.values)
    const written: FakeRow[] = []
    const now = new Date().toISOString()

    for (const row of rows) {
      const existing =
        this.action === 'upsert' && this.conflictColumns.length > 0
          ? table.find((candidate) =>
              this.conflictColumns.every(
                (column) => candidate[column] === row[column],
              ),
            )
          : undefined

      if (existing) {
        if (this.ignoreDuplicates) continue
        Object.assign(existing, row, { updated_at: now })
        written.push(existing)
        continue
      }

      const inserted: FakeRow = {
        id: typeof row.id === 'string' ? row.id : fakeId(),
        created_at: now,
        updated_at: now,
        ...row,
      }
      table.push(inserted)
      written.push(inserted)
    }

    return written
  }
}

export function createFakeSupabase(seed: Partial<FakeTables> = {}): FakeSupabase {
  const initialSeed: FakeTables = {
    ...emptyTables(),
    ...seed,
  }
  let tables = cloneTables(initialSeed)
  let failure: { table: FakeTableName; error: FakeError; after: number } | null = null
  let actionFailure: {
    table: FakeTableName
    action: FakeAction
    error: FakeError
  } | null = null
  let insertCounts: Record<FakeTableName, number> = { quiz_sets: 0, questions: 0 }

  const client: FakeSupabase = {
    from(table) {
      return new FakeQuery(client, table as FakeTableName)
    },
    reset(nextSeed) {
      tables = cloneTables(
        nextSeed ? { ...emptyTables(), ...nextSeed } : initialSeed,
      )
      failure = null
      actionFailure = null
      insertCounts = { quiz_sets: 0, questions: 0 }
    },
    failNextInsert(table, error, after = 0) {
      failure = { table, error, after }
    },
    failNextSelect(table, error) {
      actionFailure = { table, action: 'select', error }
    },
    failNextAction(table, action, error) {
      actionFailure = { table, action, error }
    },
    consumeInsertFailure(table) {
      insertCounts[table] += 1
      if (!failure || failure.table !== table) return null
      if (insertCounts[table] <= failure.after) return null

      const current = failure
      failure = null
      return current.error
    },
    consumeActionFailure(table, action) {
      if (
        !actionFailure ||
        actionFailure.table !== table ||
        actionFailure.action !== action
      ) {
        return null
      }

      const current = actionFailure
      actionFailure = null
      return current.error
    },
    get tables() {
      return tables
    },
    get insertCounts() {
      return insertCounts
    },
  }

  return client
}

export function createSeedTables(): FakeTables {
  const tables = emptyTables()

  mockSets.forEach((set, setIndex) => {
    tables.quiz_sets.push({
      id: set.id,
      owner_id: TEST_OWNER_ID,
      title: set.title,
      description: set.description,
      topic_labels: {},
      is_public: false,
      source_filename: null,
      source_hash: null,
      created_at: `2026-11-${String(12 - setIndex).padStart(2, '0')}T00:00:00.000Z`,
      updated_at: `2026-11-${String(12 - setIndex).padStart(2, '0')}T00:00:00.000Z`,
    })

    const questions = mockQuestionsBySet[set.id] ?? []
    questions.forEach((question, index) => {
      tables.questions.push({
        id: question.id,
        set_id: set.id,
        owner_id: TEST_OWNER_ID,
        question_number: question.number,
        topic: question.topic,
        question: question.prompt,
        options: question.options,
        correct_answers: question.correctAnswers,
        explanation: question.explanation,
        content_hash: `seed-${question.id}`,
        sort_order: index,
        created_at: `2026-11-${String(12 - setIndex).padStart(2, '0')}T00:00:00.000Z`,
      })
    })
  })

  return tables
}

export function createSeededFakeSupabase(): FakeSupabase {
  return createFakeSupabase(createSeedTables())
}

let sharedFakeSupabase: FakeSupabase | null = null

export function getSharedFakeSupabase(): FakeSupabase {
  if (!sharedFakeSupabase) {
    sharedFakeSupabase = createSeededFakeSupabase()
  }

  return sharedFakeSupabase
}
