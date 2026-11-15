import { cn } from '../../lib/cn'
import { Modal } from '../../components/Modal'
import { setReadingSize, useReadingSize, type ReadingSize } from './readingScale'

type SizeOption = {
  value: ReadingSize
  label: string
  sampleClassName: string
}

const sizeOptions: SizeOption[] = [
  { value: 'small', label: '小', sampleClassName: 'text-sm' },
  { value: 'normal', label: '標準', sampleClassName: 'text-base' },
  { value: 'large', label: '大', sampleClassName: 'text-lg' },
  { value: 'xlarge', label: '特大', sampleClassName: 'text-xl' },
]

type ReadingScaleOptionsProps = {
  className?: string
}

export function ReadingScaleOptions({ className }: ReadingScaleOptionsProps) {
  const size = useReadingSize()

  return (
    <div className={className}>
      <div role="radiogroup" aria-label="閱讀字級" className="grid grid-cols-4 gap-2">
        {sizeOptions.map((option) => {
          const checked = option.value === size

          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper',
                checked
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-surface text-ink hover:border-accent/60',
              )}
            >
              <input
                type="radio"
                name="reading-size"
                value={option.value}
                checked={checked}
                onChange={() => setReadingSize(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn('font-serif leading-none', option.sampleClassName)}
              >
                Aa
              </span>
              <span className="text-xs">{option.label}</span>
            </label>
          )
        })}
      </div>
      <div className="mt-4 rounded-lg border border-line bg-paper p-4">
        <p className="reading-prompt font-serif text-ink">
          閱讀字級預覽：細胞膜負責調控物質進出細胞。
        </p>
      </div>
    </div>
  )
}

type ReadingScaleDialogProps = {
  open: boolean
  onClose: () => void
}

export function ReadingScaleDialog({ open, onClose }: ReadingScaleDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="字級"
      description="調整題幹、選項與解析的字級。設定只儲存在這台裝置。"
    >
      <ReadingScaleOptions />
    </Modal>
  )
}

type ReadingScaleButtonProps = {
  onClick: () => void
  className?: string
}

export function ReadingScaleButton({ onClick, className }: ReadingScaleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="調整字級"
      title="調整字級"
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-serif text-sm leading-none text-ink shadow-card transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      <span aria-hidden="true">Aa</span>
    </button>
  )
}
