import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-surface hover:bg-[#184a3a]',
  secondary: 'border border-line bg-surface text-ink hover:bg-paper',
  ghost: 'text-ink hover:bg-accent-soft',
  danger: 'border border-wrong/30 bg-surface text-wrong hover:bg-wrong-soft',
}

export function buttonStyles(variant: ButtonVariant = 'primary', className?: string) {
  return cn(base, variants[variant], className)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
