import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Modal } from '../../components/Modal'
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from './theme'

type ThemeOption = {
  value: ThemePreference
  label: string
  icon: typeof Sun
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: '淺色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟隨系統', icon: Monitor },
]

type ThemeOptionsProps = {
  className?: string
}

export function ThemeOptions({ className }: ThemeOptionsProps) {
  const preference = useThemePreference()

  return (
    <div
      role="radiogroup"
      aria-label="主題"
      className={cn('grid grid-cols-3 gap-2', className)}
    >
      {themeOptions.map((option) => {
        const checked = option.value === preference
        const Icon = option.icon

        return (
          <label
            key={option.value}
            className={cn(
              'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper',
              checked
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-surface text-ink hover:border-accent/60',
            )}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={checked}
              onChange={() => setThemePreference(option.value)}
              className="sr-only"
            />
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span className="text-xs">{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

type ThemeDialogProps = {
  open: boolean
  onClose: () => void
}

export function ThemeDialog({ open, onClose }: ThemeDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="主題"
      description="選擇淺色、深色或跟隨系統。設定只儲存在這台裝置。"
    >
      <ThemeOptions />
    </Modal>
  )
}

type ThemeButtonProps = {
  onClick: () => void
  className?: string
}

export function ThemeButton({ onClick, className }: ThemeButtonProps) {
  const preference = useThemePreference()
  const Icon =
    preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="調整主題"
      title="調整主題"
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}
