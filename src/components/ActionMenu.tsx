import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../lib/cn'

export type ActionMenuItem = {
  label: string
  onSelect?: () => void
  href?: string
  danger?: boolean
}

type ActionMenuProps = {
  label: string
  items: ActionMenuItem[]
  className?: string
}

function itemClassName(danger?: boolean) {
  return cn(
    'flex min-h-9 w-full items-center rounded-md px-3 text-left text-sm transition-colors duration-150 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    danger ? 'text-wrong' : 'text-ink',
  )
}

export function ActionMenu({ label, items, className }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-20 mt-1 min-w-36 rounded-lg border border-line bg-surface p-1 shadow-card"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              {item.href ? (
                <Link
                  role="menuitem"
                  to={item.href}
                  className={itemClassName(item.danger)}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={itemClassName(item.danger)}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect?.()
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
