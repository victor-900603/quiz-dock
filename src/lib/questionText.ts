import type { Question } from '../types/quiz'

export function formatQuestionNumber(number: number): string {
  return `#${String(number).padStart(3, '0')}`
}

export function formatQuestionForCopy(question: Question): string {
  const heading = `${formatQuestionNumber(question.number)} ${question.topic}`.trim()
  const options = question.options
    .map((option) => `${option.key}. ${option.text}`)
    .join('\n')

  return `${heading}\n${question.prompt}\n\n${options}`
}
