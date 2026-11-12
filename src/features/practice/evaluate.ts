export function evaluateAnswer(selected: string[], correct: string[]): boolean {
  const normalizedSelected = [...new Set(selected)].sort()
  const normalizedCorrect = [...new Set(correct)].sort()

  return (
    normalizedSelected.length === normalizedCorrect.length &&
    normalizedSelected.every((value, index) => value === normalizedCorrect[index])
  )
}

export function isMultiAnswer(correctAnswers: string[]): boolean {
  return new Set(correctAnswers).size > 1
}
