import type { DayOfWeek, Teacher } from '@/types'

export interface TeacherMeta {
  code: string
  classIds: string[]
  availability: Record<DayOfWeek, number[]>
}

const EMPTY_AVAILABILITY: Record<DayOfWeek, number[]> = {
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
}

export function parseTeacherMeta(teacher: Teacher): TeacherMeta {
  const fallback: TeacherMeta = {
    code: '',
    classIds: [],
    availability: teacher.availability ?? EMPTY_AVAILABILITY,
  }

  if (!teacher.contact_info) return fallback

  try {
    const parsed = JSON.parse(teacher.contact_info) as Partial<TeacherMeta>
    return {
      code: parsed.code ?? '',
      classIds: parsed.classIds ?? [],
      availability: parsed.availability ?? fallback.availability,
    }
  } catch {
    return fallback
  }
}

export function stringifyTeacherMeta(meta: TeacherMeta): string {
  return JSON.stringify(meta)
}
