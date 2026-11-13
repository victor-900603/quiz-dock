import { mockQuestionsBySet, mockSets } from '../data/mock'

export type FakeError = {
  message: string
}

export type FakeRow = Record<string, unknown>

export type FakeTableName =
  | 'quiz_sets'
  | 'questions'
  | 'practice_sessions'
  | 'attempts'
  | 'question_marks'

export type FakeRpcName = 'start_practice_session' | 'submit_answer'

export type FakeTables = Record<FakeTableName, FakeRow[]>

export type FakeResult = {
  data: unknown
  error: FakeError | null
}

export type FakeSupabase = {
  from: (table: string) => FakeQuery
  rpc: (fn: FakeRpcName, args?: Record<string, unknown>) => Promise<FakeResult>
  reset: (seed?: Partial<FakeTables>) => void
  failNextInsert: (table: FakeTableName, error: FakeError, after?: number) => void
  failNextSelect: (table: FakeTableName, error: FakeError) => void
  failNextAction: (
    table: FakeTableName,
    action: FakeAction,
    error: FakeError,
  ) => void
  failNextRpc: (fn: FakeRpcName, error: FakeError) => void
  consumeInsertFailure: (table: FakeTableName) => FakeError | null
  consumeActionFailure: (table: FakeTableName, action: FakeAction) => FakeError | null
  readonly tables: FakeTables
  readonly insertCounts: Record<FakeTableName, number>
}

export const TEST_OWNER_ID = 'test-user'

type FakeAction = 'select' | 'insert' | 'upsert' | 'update' | 'delete'

type FakeMode = 'single' | 'maybeSingle' | null

function emptyTables(): FakeTables {
  return {
    quiz_sets: [],
    questions: [],
    practice_sessions: [],
    attempts: [],
    question_marks: [],
  }
}

function cloneTables(tables: FakeTables): FakeTables {
  return {
    quiz_sets: tables.quiz_sets.map((row) => ({ ...row })),
    questions: tables.questions.map((row) => ({ ...row })),
    practice_sessions: tables.practice_sessions.map((row) => ({ ...row })),
    attempts: tables.attempts.map((row) => ({ ...row })),
    question_marks: tables.question_marks.map((row) => ({ ...row })),
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

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizeAnswers(values: string[]): string[] {
  return [...new Set(values)].sort()
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
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
  private inFilters: Array<[string, unknown[]]> = []
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

  in(column: string, values: unknown[]): this {
    this.inFilters.push([column, values])
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
    return (
      this.filters.every(([column, value]) => row[column] === value) &&
      this.inFilters.every(([column, values]) => values.includes(row[column]))
    )
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
      this.deleteRows(matching)
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

  private deleteRows(matching: FakeRow[]): void {
    this.owner.tables[this.table] = this.owner.tables[this.table].filter(
      (row) => !matching.includes(row),
    )

    const deletedIds = new Set(
      matching
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string'),
    )

    if (this.table === 'quiz_sets') {
      const deletedQuestionIds = new Set(
        this.owner.tables.questions
          .filter((row) => deletedIds.has(String(row.set_id)))
          .map((row) => String(row.id)),
      )
      this.owner.tables.questions = this.owner.tables.questions.filter(
        (row) => !deletedIds.has(String(row.set_id)),
      )
      this.owner.tables.practice_sessions = this.owner.tables.practice_sessions.filter(
        (row) => !deletedIds.has(String(row.set_id)),
      )
      this.owner.tables.attempts = this.owner.tables.attempts.filter(
        (row) => !deletedIds.has(String(row.set_id)),
      )
      this.owner.tables.question_marks = this.owner.tables.question_marks.filter(
        (row) => !deletedQuestionIds.has(String(row.question_id)),
      )
    }

    if (this.table === 'questions') {
      this.owner.tables.attempts = this.owner.tables.attempts.filter(
        (row) => !deletedIds.has(String(row.question_id)),
      )
      this.owner.tables.question_marks = this.owner.tables.question_marks.filter(
        (row) => !deletedIds.has(String(row.question_id)),
      )
    }

    if (this.table === 'practice_sessions') {
      this.owner.tables.attempts = this.owner.tables.attempts.filter(
        (row) => !deletedIds.has(String(row.session_id)),
      )
    }
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

      const inserted: FakeRow =
        this.table === 'question_marks'
          ? { created_at: now, ...row }
          : {
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
  let rpcFailure: { name: FakeRpcName; error: FakeError } | null = null
  let insertCounts: Record<FakeTableName, number> = {
    quiz_sets: 0,
    questions: 0,
    practice_sessions: 0,
    attempts: 0,
    question_marks: 0,
  }

  function startPracticeSession(args: Record<string, unknown>): FakeResult {
    const setId = asString(args.p_set_id)
    const mode = args.p_mode === 'random' ? 'random' : 'sequential'
    const restart = args.p_restart === true
    const set = tables.quiz_sets.find((row) => row.id === setId)

    if (!set) return { data: null, error: { message: 'set not found' } }

    const questions = tables.questions
      .filter((row) => row.set_id === setId)
      .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))

    if (questions.length === 0) {
      return { data: null, error: { message: 'set has no questions' } }
    }

    const existing = tables.practice_sessions.find((row) => row.set_id === setId)
    if (existing && !restart) {
      return { data: { ...existing }, error: null }
    }

    const questionOrder =
      mode === 'random'
        ? shuffle(questions.map((question) => String(question.id)))
        : questions.map((question) => String(question.id))
    const now = new Date().toISOString()

    if (existing) {
      tables.attempts = tables.attempts.filter((row) => row.session_id !== existing.id)
      Object.assign(existing, {
        mode,
        status: 'in_progress',
        question_order: questionOrder,
        current_index: 0,
        total_questions: questionOrder.length,
        answered_count: 0,
        correct_count: 0,
        started_at: now,
        updated_at: now,
        completed_at: null,
      })
      return { data: { ...existing }, error: null }
    }

    const created: FakeRow = {
      id: fakeId(),
      user_id: TEST_OWNER_ID,
      set_id: setId,
      mode,
      status: 'in_progress',
      question_order: questionOrder,
      current_index: 0,
      total_questions: questionOrder.length,
      answered_count: 0,
      correct_count: 0,
      started_at: now,
      updated_at: now,
      completed_at: null,
    }
    tables.practice_sessions.push(created)

    return { data: { ...created }, error: null }
  }

  function submitAnswer(args: Record<string, unknown>): FakeResult {
    const sessionId = asString(args.p_session_id)
    const questionId = asString(args.p_question_id)
    const selected = normalizeAnswers(asStringArray(args.p_selected))

    if (selected.length === 0) {
      return { data: null, error: { message: 'no selection' } }
    }

    const session = tables.practice_sessions.find((row) => row.id === sessionId)
    if (!session) {
      return { data: null, error: { message: 'session not found' } }
    }

    const question = tables.questions.find(
      (row) => row.id === questionId && row.set_id === session.set_id,
    )
    if (!question) {
      return { data: null, error: { message: 'question not found' } }
    }

    const questionOrder = asStringArray(session.question_order)
    const position = questionOrder.indexOf(questionId)
    if (position === -1) {
      return { data: null, error: { message: 'question not in session' } }
    }

    const correctAnswers = normalizeAnswers(asStringArray(question.correct_answers))
    const isCorrect = arraysEqual(selected, correctAnswers)
    const existing = tables.attempts.find(
      (row) => row.session_id === sessionId && row.question_id === questionId,
    )
    const wasUpdated = existing
      ? !arraysEqual(asStringArray(existing.selected), selected) ||
        existing.is_correct !== isCorrect
      : false
    const now = new Date().toISOString()
    const durationMs = typeof args.p_duration_ms === 'number' ? args.p_duration_ms : null

    if (existing) {
      Object.assign(existing, {
        selected,
        is_correct: isCorrect,
        duration_ms: durationMs,
        updated_at: now,
      })
    } else {
      tables.attempts.push({
        id: fakeId(),
        user_id: TEST_OWNER_ID,
        session_id: sessionId,
        set_id: session.set_id,
        question_id: questionId,
        selected,
        is_correct: isCorrect,
        duration_ms: durationMs,
        answered_at: now,
        updated_at: now,
      })
    }

    const sessionAttempts = tables.attempts.filter((row) => row.session_id === sessionId)
    const answeredCount = sessionAttempts.length
    const correctCount = sessionAttempts.filter((row) => row.is_correct === true).length
    let currentIndex = Number(session.current_index)

    if (!existing) {
      let nextIndex: number | null = null
      for (let step = 1; step <= questionOrder.length; step += 1) {
        const candidate = (position + step) % questionOrder.length
        const answered = sessionAttempts.some(
          (row) => row.question_id === questionOrder[candidate],
        )
        if (!answered) {
          nextIndex = candidate
          break
        }
      }
      currentIndex = nextIndex === null ? questionOrder.length : nextIndex
    }

    const status =
      answeredCount >= questionOrder.length ? 'completed' : 'in_progress'
    if (status === 'completed') currentIndex = questionOrder.length

    Object.assign(session, {
      current_index: currentIndex,
      answered_count: answeredCount,
      correct_count: correctCount,
      status,
      completed_at:
        status === 'completed' ? session.completed_at ?? now : null,
      updated_at: now,
    })

    return {
      data: [
        {
          is_correct: isCorrect,
          correct_answers: correctAnswers,
          explanation:
            typeof question.explanation === 'string' ? question.explanation : '',
          already_answered: Boolean(existing),
          was_updated: wasUpdated,
          session_status: status,
          current_index: currentIndex,
          answered_count: answeredCount,
          correct_count: correctCount,
        },
      ],
      error: null,
    }
  }

  const client: FakeSupabase = {
    from(table) {
      return new FakeQuery(client, table as FakeTableName)
    },
    rpc(name, args = {}) {
      if (rpcFailure && rpcFailure.name === name) {
        const current = rpcFailure
        rpcFailure = null
        return Promise.resolve({ data: null, error: current.error })
      }

      if (name === 'start_practice_session') {
        return Promise.resolve(startPracticeSession(args))
      }

      return Promise.resolve(submitAnswer(args))
    },
    reset(nextSeed) {
      tables = cloneTables(
        nextSeed ? { ...emptyTables(), ...nextSeed } : initialSeed,
      )
      failure = null
      actionFailure = null
      rpcFailure = null
      insertCounts = {
        quiz_sets: 0,
        questions: 0,
        practice_sessions: 0,
        attempts: 0,
        question_marks: 0,
      }
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
    failNextRpc(name, error) {
      rpcFailure = { name, error }
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
    const questions = mockQuestionsBySet[set.id] ?? []
    const topicLabels = Object.fromEntries(
      questions.map((question) => [question.topic, question.topic]),
    )

    tables.quiz_sets.push({
      id: set.id,
      owner_id: TEST_OWNER_ID,
      title: set.title,
      description: set.description,
      topic_labels: topicLabels,
      is_public: false,
      source_filename: null,
      source_hash: null,
      created_at: `2026-11-${String(12 - setIndex).padStart(2, '0')}T00:00:00.000Z`,
      updated_at: `2026-11-${String(12 - setIndex).padStart(2, '0')}T00:00:00.000Z`,
    })

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

  const seedMarks: Array<[string, string]> = [
    ['bio-1', '2026-11-13T09:35:00.000Z'],
    ['history-2', '2026-11-13T08:50:00.000Z'],
    ['bio-3', '2026-11-12T21:10:00.000Z'],
    ['english-4', '2026-11-08T10:00:00.000Z'],
    ['bio-5', '2026-11-07T10:00:00.000Z'],
    ['history-9', '2026-11-06T10:00:00.000Z'],
    ['english-17', '2026-11-05T10:00:00.000Z'],
    ['history-18', '2026-11-03T10:00:00.000Z'],
    ['cs-7', '2026-11-02T10:00:00.000Z'],
    ['cs-14', '2026-10-31T10:00:00.000Z'],
  ]

  for (const [questionId, createdAt] of seedMarks) {
    tables.question_marks.push({
      user_id: TEST_OWNER_ID,
      question_id: questionId,
      created_at: createdAt,
    })
  }

  const biologyQuestions = mockQuestionsBySet.biology ?? []
  if (biologyQuestions.length > 0) {
    const now = '2026-11-13T00:00:00.000Z'
    tables.practice_sessions.push({
      id: 'session-biology',
      user_id: TEST_OWNER_ID,
      set_id: 'biology',
      mode: 'sequential',
      status: 'in_progress',
      question_order: biologyQuestions.map((question) => question.id),
      current_index: 2,
      total_questions: biologyQuestions.length,
      answered_count: 2,
      correct_count: 2,
      started_at: now,
      updated_at: now,
      completed_at: null,
    })
    tables.attempts.push(
      {
        id: 'attempt-bio-1',
        user_id: TEST_OWNER_ID,
        session_id: 'session-biology',
        set_id: 'biology',
        question_id: 'bio-1',
        selected: ['B'],
        is_correct: true,
        duration_ms: 12000,
        answered_at: now,
        updated_at: now,
      },
      {
        id: 'attempt-bio-2',
        user_id: TEST_OWNER_ID,
        session_id: 'session-biology',
        set_id: 'biology',
        question_id: 'bio-2',
        selected: ['B'],
        is_correct: true,
        duration_ms: 15000,
        answered_at: now,
        updated_at: now,
      },
    )
  }

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
