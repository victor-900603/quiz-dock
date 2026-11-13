import type { MarkedQuestion } from '../../types/quiz'

export type MarkGroup = {
  setId: string
  setTitle: string
  marks: MarkedQuestion[]
}

export function groupMarksBySet(marks: MarkedQuestion[]): MarkGroup[] {
  const groups = new Map<string, MarkGroup>()

  for (const mark of marks) {
    const group = groups.get(mark.setId)

    if (group) {
      group.marks.push(mark)
    } else {
      groups.set(mark.setId, {
        setId: mark.setId,
        setTitle: mark.setTitle,
        marks: [mark],
      })
    }
  }

  return [...groups.values()]
}
