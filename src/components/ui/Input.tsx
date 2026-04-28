import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label ? <span className="text-xs font-semibold text-gray-600">{label}</span> : null}
      <input
        className={cn(
          'w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-indigo-400/40',
          className
        )}
        {...props}
      />
    </label>
  )
}
