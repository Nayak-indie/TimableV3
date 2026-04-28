import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label ? <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span> : null}
      <input
        className={cn(
          'w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]',
          className
        )}
        {...props}
      />
    </label>
  )
}
