import { cn } from '@/lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--surface-primary)] backdrop-blur rounded-3xl border border-[var(--border-color)] p-4 shadow-[var(--shadow-primary)] transition-transform duration-200 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
