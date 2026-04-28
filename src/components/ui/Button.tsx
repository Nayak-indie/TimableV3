import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  fullWidth?: boolean
}

export default function Button({ variant = 'primary', fullWidth = false, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'text-white hover:brightness-105',
        variant === 'secondary' && 'bg-[var(--accent-soft)] text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent-soft)_70%,white)]',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 hover:brightness-105',
        variant === 'ghost' && 'bg-[var(--surface-primary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--surface-secondary)]',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
