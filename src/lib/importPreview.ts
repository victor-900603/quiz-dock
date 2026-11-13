export type ImportPreview = {
  title: string
  description: string
  questionCount: number
  topics: Array<{ name: string; count: number }>
  sample: string[]
}

export type ImportPreviewResult = {
  preview: ImportPreview | null
  error: string | null
}

export function parseImportPreview(text: string, fileName = ''): ImportPreviewResult {
  try {
    const data: unknown = JSON.parse(text)
    const isArray = Array.isArray(data)
    const questions = isArray
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { questions?: unknown }).questions)
        ? (data as { questions: unknown[] }).questions
        : null

    if (!questions) {
      return { preview: null, error: 'JSON 必須是題目陣列，或包含 questions 陣列的物件。' }
    }

    if (questions.length === 0) {
      return { preview: null, error: '題庫沒有題目。' }
    }

    const topicCounts = new Map<string, number>()
    const sample: string[] = []

    for (const item of questions) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const rawTopic = record.topic
      const topic =
        rawTopic == null || (typeof rawTopic === 'string' && rawTopic.trim() === '')
          ? '未分類'
          : String(rawTopic).trim()
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
      if (sample.length < 3) {
        sample.push(String(record.question ?? '').slice(0, 90))
      }
    }

    const fileTitle = fileName.replace(/\.json$/i, '').trim() || '未命名題庫'
    const title = isArray ? fileTitle : String((data as { title?: unknown }).title ?? fileTitle)
    const description = isArray ? '' : String((data as { description?: unknown }).description ?? '')

    return {
      preview: {
        title,
        description,
        questionCount: questions.length,
        topics: [...topicCounts.entries()].map(([name, count]) => ({ name, count })),
        sample,
      },
      error: null,
    }
  } catch {
    return { preview: null, error: '無法解析 JSON，請確認格式。' }
  }
}
