import { ImportError, normalizeImport } from '../schemas/import'

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

export async function parseImportPreview(
  text: string,
  fileName = '',
): Promise<ImportPreviewResult> {
  try {
    const normalized = await normalizeImport({ text, fileName, title: '' })
    const topicCounts = new Map<string, number>()
    const sample: string[] = []

    for (const question of normalized.questions) {
      const topic = question.topic?.trim() || '未分類'
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
      if (sample.length < 3) {
        sample.push(question.question.slice(0, 90))
      }
    }

    return {
      preview: {
        title: normalized.title,
        description: normalized.description ?? '',
        questionCount: normalized.questions.length,
        topics: [...topicCounts.entries()].map(([name, count]) => ({ name, count })),
        sample,
      },
      error: null,
    }
  } catch (error) {
    if (error instanceof ImportError) {
      return {
        preview: null,
        error:
          error.code === 'INVALID_JSON'
            ? '無法解析 JSON，請確認格式。'
            : error.message,
      }
    }

    return { preview: null, error: '無法解析檔案，請確認格式。' }
  }
}
