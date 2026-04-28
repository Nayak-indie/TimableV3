import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-gradient-to-r from-indigo-100 via-indigo-50 to-indigo-100 bg-[length:200%_100%]',
        className
      )}
    />
  )
}
