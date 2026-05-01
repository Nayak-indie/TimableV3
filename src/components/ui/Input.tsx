import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
}

export default function Input({ label, icon, className, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label ? <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span> : null}
      <div className="relative">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
            {icon}
          </span>
        ) : null}
        <input
          className={cn(
            'w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]',
            icon ? 'pl-11' : null,
            className
          )}
          {...props}
        />
      </div>
    </label>
  )
}
