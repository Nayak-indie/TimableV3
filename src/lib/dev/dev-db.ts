export type DevTableName =
  | 'terms'
  | 'period_slots'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'timetable_entries'
  | 'events'
  | 'absences'
  | 'change_log'
  | 'class_subject_links'

export type DevRow = Record<string, unknown> & {
  id?: string
  created_at?: string
}

export interface DevDb {
  terms: DevRow[]
  period_slots: DevRow[]
  teachers: DevRow[]
  classes: DevRow[]
  subjects: DevRow[]
  timetable_entries: DevRow[]
  events: DevRow[]
  absences: DevRow[]
  change_log: DevRow[]
  class_subject_links: DevRow[]
}

export const EMPTY_DEV_DB: DevDb = {
  terms: [],
  period_slots: [],
  teachers: [],
  classes: [],
  subjects: [],
  timetable_entries: [],
  events: [],
  absences: [],
  change_log: [],
  class_subject_links: [],
}

const PLACEHOLDER_MARKERS = ['placeholder.supabase.co', 'placeholder-anon-key', 'placeholder-service-role-key']

export function hasRealSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !anonKey || !serviceKey) return false
  return !PLACEHOLDER_MARKERS.some((marker) => [url, anonKey, serviceKey].some((value) => value.includes(marker)))
}

export function normalizeDevDb(input: Partial<DevDb> | null | undefined): DevDb {
  return {
    terms: Array.isArray(input?.terms) ? input.terms : [],
    period_slots: Array.isArray(input?.period_slots) ? input.period_slots : [],
    teachers: Array.isArray(input?.teachers) ? input.teachers : [],
    classes: Array.isArray(input?.classes) ? input.classes : [],
    subjects: Array.isArray(input?.subjects) ? input.subjects : [],
    timetable_entries: Array.isArray(input?.timetable_entries) ? input.timetable_entries : [],
    events: Array.isArray(input?.events) ? input.events : [],
    absences: Array.isArray(input?.absences) ? input.absences : [],
    change_log: Array.isArray(input?.change_log) ? input.change_log : [],
    class_subject_links: Array.isArray(input?.class_subject_links) ? input.class_subject_links : [],
  }
}

export function cloneDevDb(db: DevDb): DevDb {
  return JSON.parse(JSON.stringify(db)) as DevDb
}

export function createDevId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}
