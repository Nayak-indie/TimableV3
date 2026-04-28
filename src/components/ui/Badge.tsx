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
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
        variant === 'default' && 'bg-gray-100 text-gray-600',
        variant === 'success' && 'bg-green-100 text-green-700',
        variant === 'warning' && 'bg-amber-100 text-amber-700',
        variant === 'danger' && 'bg-red-100 text-red-700',
        className
      )}
    >
      {label}
    </span>
  )
}
