import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import type { ConflictWarning, DayOfWeek, TimetableEntry } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'dd MMM yyyy')
}

export function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const jsDay = new Date().getDay()
  return days[jsDay - 1] ?? 'Mon'
}

export function detectConflicts(entries: TimetableEntry[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    if (!entry.teacher_id) continue
    const key = `${entry.teacher_id}-${entry.day}-${entry.period_number}`
    if (seen.has(key)) {
      warnings.push({
        type: 'double_booking',
        message: `Teacher double-booked on ${entry.day}, period ${entry.period_number}`,
        teacherId: entry.teacher_id,
        day: entry.day,
        period: entry.period_number,
      })
    } else {
      seen.add(key)
    }
  }

  return warnings
}
