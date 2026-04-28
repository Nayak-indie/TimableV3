import { cn } from '@/lib/utils'

interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export default function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent',
        variant === 'default' && 'bg-[var(--accent-soft)] text-[var(--text-primary)]',
        variant === 'success' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
        variant === 'warning' && 'bg-amber-100 text-amber-700 border-amber-200',
        variant === 'danger' && 'bg-red-100 text-red-700 border-red-200',
        className
      )}
    >
      {label}
    </span>
  )
}
