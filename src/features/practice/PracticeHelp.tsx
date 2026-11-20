import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { cn } from '../../lib/cn'

function KeyCap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-xs leading-5 text-ink shadow-sm">
      {children}
    </kbd>
  )
}

type PracticeHelpButtonProps = {
  onClick: () => void
  className?: string
}

export function PracticeHelpButton({ onClick, className }: PracticeHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="練習說明"
      aria-haspopup="dialog"
      title="練習說明"
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      <CircleHelp className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

type PracticeHelpDialogProps = {
  open: boolean
  onClose: () => void
}

export function PracticeHelpDialog({ open, onClose }: PracticeHelpDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="練習說明"
      description="作答、換題與進度保存方式。"
      footer={
        <Button variant="secondary" onClick={onClose}>
          知道了
        </Button>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="font-serif text-lg text-ink">作答</h3>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted">
            <li className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <KeyCap>1</KeyCap>
                <span aria-hidden="true">-</span>
                <KeyCap>9</KeyCap>
              </span>
              <span>選擇對應選項。</span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <KeyCap>Enter</KeyCap>
              <span>送出答案；已送出時再按一次前往下一題。</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-serif text-lg text-ink">換題與進度</h3>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted">
            <li className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <KeyCap>←</KeyCap>
                <KeyCap>→</KeyCap>
              </span>
              <span>切換上一題或下一題。</span>
            </li>
            <li>使用題號工具列或題號列表跳到任一題。</li>
            <li className="lg:hidden">手機可使用底部「上一題」、「題號」、「下一題」工具列。</li>
            <li>離開後進度會保留。</li>
          </ul>
        </section>
      </div>
    </Modal>
  )
}
