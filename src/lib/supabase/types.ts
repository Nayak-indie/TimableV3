import type { Class, Event, PeriodSlot, Subject, Teacher, Term, TimetableEntry } from '@/types'

export interface ClassSubjectLink {
  id?: string
  class_id: string
  subject_id: string
  created_at?: string
}

export type GenericRow = Record<string, unknown>

export interface AppTableDataMap {
  terms: Term[]
  period_slots: PeriodSlot[]
  teachers: Teacher[]
  classes: Class[]
  subjects: Subject[]
  timetable_entries: TimetableEntry[]
  events: Event[]
  absences: GenericRow[]
  change_log: GenericRow[]
  class_subject_links: ClassSubjectLink[]
}

type SingleRow<TData> = TData extends Array<infer TRow> ? TRow : TData

export interface QueryResult<T = unknown> {
  data: T | null
  error: null | Error
  count: number | null
}

export interface AppQueryBuilder<TData = unknown> extends PromiseLike<QueryResult<TData>> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): AppQueryBuilder<TData>
  insert(values: Record<string, unknown> | Record<string, unknown>[]): AppQueryBuilder<TData>
  update(values: Record<string, unknown>): AppQueryBuilder<TData>
  delete(): AppQueryBuilder<TData>
  eq(column: string, value: unknown): AppQueryBuilder<TData>
  ilike(column: string, value: string): AppQueryBuilder<TData>
  in(column: string, values: unknown[]): AppQueryBuilder<TData>
  gte(column: string, value: unknown): AppQueryBuilder<TData>
  lte(column: string, value: unknown): AppQueryBuilder<TData>
  order(column: string, options?: { ascending?: boolean }): AppQueryBuilder<TData>
  limit(value: number): AppQueryBuilder<TData>
  single(): AppQueryBuilder<SingleRow<TData>>
}

export interface AppSupabaseClient {
  from<TTable extends keyof AppTableDataMap>(table: TTable): AppQueryBuilder<AppTableDataMap[TTable]>
  from<TData = unknown>(table: string): AppQueryBuilder<TData>
}
