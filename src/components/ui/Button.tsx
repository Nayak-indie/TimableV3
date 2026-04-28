import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  fullWidth?: boolean
}

export default function Button({ variant = 'primary', fullWidth = false, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600',
        variant === 'secondary' && 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        variant === 'ghost' && 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
