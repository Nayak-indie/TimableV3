import { cn } from '@/lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white/95 backdrop-blur rounded-3xl border border-indigo-100/70 p-4 shadow-[0_8px_30px_rgb(99,102,241,0.08)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
