import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  DailyActivity,
  PracticeMode,
  PracticeStatus,
  SetStat,
  SetStatsDetail,
  StatsOverview,
  TopicStat,
} from '../../types/quiz'
import { shiftDateKey, taipeiDateKey } from '../../lib/dates'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { parseTopicLabels, topicLabel } from '../library/libraryService'

type Client = SupabaseClient<Database>
type SetRow = Database['public']['Tables']['quiz_sets']['Row']
type SetMetaRow = Pick<SetRow, 'id' | 'title' | 'topic_labels'>
type SetStatsRow = Database['public']['Views']['v_set_stats']['Row']
type TopicStatsRow = Database['public']['Views']['v_topic_stats']['Row']
type DailyActivityRow = Database['public']['Views']['v_daily_activity']['Row']
type SessionSummaryRow = Database['public']['Views']['v_session_summary']['Row']

type SetMeta = {
  id: string
  title: string
  labels: Record<string, string>
}

const collator = new Intl.Collator('zh-TW', { numeric: true })

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' ? value : 0
}

function toPracticeMode(value: string | null): PracticeMode {
  return value === 'random' ? 'random' : 'sequential'
}

function toPracticeStatus(value: string | null): PracticeStatus {
  if (value === 'completed') return 'completed'
  if (value === 'abandoned') return 'abandoned'
  return 'in_progress'
}

function roundAccuracy(correct: number, answered: number): number | null {
  if (answered <= 0) return null
  return Math.round((correct / answered) * 1000) / 10
}

function accuracyOf(
  accuracy: number | null,
  correct: number,
  answered: number,
): number | null {
  return typeof accuracy === 'number' ? accuracy : roundAccuracy(correct, answered)
}

function buildSetStats(
  rows: SetStatsRow[],
  setById: Map<string, SetMeta>,
): SetStat[] {
  return rows
    .flatMap((row) => {
      if (!row.set_id) return []

      const answered = toNumber(row.answered_count)
      const correct = toNumber(row.correct_count)

      return [
        {
          setId: row.set_id,
          title: setById.get(row.set_id)?.title ?? '未知題庫',
          answered,
          correct,
          accuracy: accuracyOf(row.accuracy, correct, answered),
          lastAnsweredAt: row.last_answered_at,
        },
      ]
    })
    .sort(
      (left, right) =>
        right.answered - left.answered || collator.compare(left.title, right.title),
    )
}

function buildTopicStats(
  rows: TopicStatsRow[],
  setById: Map<string, SetMeta>,
): TopicStat[] {
  const topics = new Map<string, TopicStat>()

  for (const row of rows) {
    if (!row.set_id) continue

    const labels = setById.get(row.set_id)?.labels ?? {}
    const name = topicLabel(row.topic, labels)
    const current = topics.get(name) ?? { name, answered: 0, correct: 0 }

    current.answered += toNumber(row.answered_count)
    current.correct += toNumber(row.correct_count)
    topics.set(name, current)
  }

  return [...topics.values()].sort(
    (left, right) =>
      right.answered - left.answered || collator.compare(left.name, right.name),
  )
}

function buildRecentSessions(
  rows: SessionSummaryRow[],
  setById: Map<string, SetMeta>,
): StatsOverview['recentSessions'] {
  return rows
    .flatMap((row) => {
      if (!row.id || !row.set_id) return []

      const answered = toNumber(row.answered_count)
      const correct = toNumber(row.correct_count)

      return [
        {
          id: row.id,
          setId: row.set_id,
          setTitle: setById.get(row.set_id)?.title ?? '未知題庫',
          mode: toPracticeMode(row.mode),
          status: toPracticeStatus(row.status),
          total: toNumber(row.total_questions),
          answered,
          correct,
          accuracy: accuracyOf(row.accuracy, correct, answered),
          startedAt: row.started_at ?? '',
          updatedAt: row.updated_at ?? '',
          completedAt: row.completed_at,
        },
      ]
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 10)
}

function buildDailyActivity(
  rows: DailyActivityRow[],
  today: string,
  days = 14,
): DailyActivity[] {
  const counts = new Map<string, { answered: number; correct: number }>()

  for (const row of rows) {
    if (!row.day) continue

    const day = row.day.slice(0, 10)
    const current = counts.get(day) ?? { answered: 0, correct: 0 }

    current.answered += toNumber(row.answered_count)
    current.correct += toNumber(row.correct_count)
    counts.set(day, current)
  }

  const activity: DailyActivity[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = shiftDateKey(today, -offset)
    if (!day) continue

    const count = counts.get(day)
    activity.push({
      day,
      label: `${day.slice(5, 7)}/${day.slice(8, 10)}`,
      answered: count?.answered ?? 0,
      correct: count?.correct ?? 0,
    })
  }

  return activity
}

async function fetchSetMeta(
  ids: string[],
  client: Client,
): Promise<Map<string, SetMeta>> {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await client
    .from('quiz_sets')
    .select('id, title, topic_labels')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入題庫資料，請稍後再試。'))
  }

  return new Map(
    ((data ?? []) as SetMetaRow[]).map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        labels: parseTopicLabels(row.topic_labels),
      },
    ]),
  )
}

export async function fetchStatsOverview(
  client: Client = supabase,
  now: Date = new Date(),
): Promise<StatsOverview> {
  const [setResult, topicResult, dailyResult, sessionResult] = await Promise.all([
    client.from('v_set_stats').select('*'),
    client.from('v_topic_stats').select('*'),
    client.from('v_daily_activity').select('*'),
    client
      .from('v_session_summary')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  if (setResult.error) {
    throw new Error(
      describeSupabaseError(setResult.error, '無法載入題庫統計，請稍後再試。'),
    )
  }

  if (topicResult.error) {
    throw new Error(
      describeSupabaseError(topicResult.error, '無法載入主題統計，請稍後再試。'),
    )
  }

  if (dailyResult.error) {
    throw new Error(
      describeSupabaseError(dailyResult.error, '無法載入每日活動，請稍後再試。'),
    )
  }

  if (sessionResult.error) {
    throw new Error(
      describeSupabaseError(sessionResult.error, '無法載入練習場次，請稍後再試。'),
    )
  }

  const setRows = setResult.data ?? []
  const topicRows = topicResult.data ?? []
  const sessionRows = sessionResult.data ?? []
  const setById = await fetchSetMeta(
    [
      ...setRows.map((row) => row.set_id),
      ...topicRows.map((row) => row.set_id),
      ...sessionRows.map((row) => row.set_id),
    ].filter((setId): setId is string => Boolean(setId)),
    client,
  )

  const setStats = buildSetStats(setRows, setById)
  const dailyActivity = buildDailyActivity(
    dailyResult.data ?? [],
    taipeiDateKey(now),
  )

  return {
    totalAnswered: setStats.reduce((sum, item) => sum + item.answered, 0),
    totalCorrect: setStats.reduce((sum, item) => sum + item.correct, 0),
    practicedSets: setStats.filter((item) => item.answered > 0).length,
    weeklyAnswered: dailyActivity
      .slice(-7)
      .reduce((sum, item) => sum + item.answered, 0),
    setStats,
    topicStats: buildTopicStats(topicRows, setById),
    recentSessions: buildRecentSessions(sessionRows, setById),
    dailyActivity,
  }
}

export async function fetchSetStats(
  setId: string,
  client: Client = supabase,
): Promise<SetStatsDetail | null> {
  const { data: setRow, error } = await client
    .from('quiz_sets')
    .select('id, title, topic_labels')
    .eq('id', setId)
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入題庫資料，請稍後再試。'))
  }

  if (!setRow) return null

  const [statResult, topicResult] = await Promise.all([
    client.from('v_set_stats').select('*').eq('set_id', setId).maybeSingle(),
    client.from('v_topic_stats').select('*').eq('set_id', setId),
  ])

  if (statResult.error) {
    throw new Error(
      describeSupabaseError(statResult.error, '無法載入題庫統計，請稍後再試。'),
    )
  }

  if (topicResult.error) {
    throw new Error(
      describeSupabaseError(topicResult.error, '無法載入主題統計，請稍後再試。'),
    )
  }

  const meta: SetMeta = {
    id: setRow.id,
    title: setRow.title,
    labels: parseTopicLabels(setRow.topic_labels),
  }
  const setById = new Map([[meta.id, meta]])
  const [setStat] = buildSetStats(
    statResult.data ? [statResult.data] : [],
    setById,
  )

  return {
    set: setStat ?? {
      setId: meta.id,
      title: meta.title,
      answered: 0,
      correct: 0,
      accuracy: null,
      lastAnsweredAt: null,
    },
    topics: buildTopicStats(topicResult.data ?? [], setById),
  }
}
