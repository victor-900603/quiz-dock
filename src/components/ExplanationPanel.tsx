type ExplanationPanelProps = {
  correctAnswers: string[]
  explanation: string
}

export function ExplanationPanel({ correctAnswers, explanation }: ExplanationPanelProps) {
  return (
    <section className="mt-5 rounded-lg border border-line bg-accent-soft/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-serif text-lg text-ink">解析</h3>
        <span className="text-xs text-muted">正確答案</span>
        {correctAnswers.map((answer) => (
          <span
            key={answer}
            className="rounded border border-correct/30 bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold text-correct"
          >
            {answer}
          </span>
        ))}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink">
        {explanation || '本題沒有解析'}
      </p>
    </section>
  )
}
