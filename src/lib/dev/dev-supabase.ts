import type { AppQueryBuilder, AppSupabaseClient, AppTableDataMap, QueryResult } from '../supabase/types'
import { createDevId, normalizeDevDb, type DevDb, type DevRow, type DevTableName } from './dev-db'

type OrderSpec = { column: string; ascending: boolean }
type Filter =
  | { type: 'eq'; column: string; value: unknown }
  | { type: 'ilike'; column: string; value: string }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'gte'; column: string; value: unknown }
  | { type: 'lte'; column: string; value: unknown }

export interface DevSupabaseBackend {
  readDb(): Promise<DevDb>
  writeDb(db: DevDb): Promise<void>
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  const leftText = left == null ? '' : String(left)
  const rightText = right == null ? '' : String(right)
  return leftText.localeCompare(rightText)
}

function matchesIlike(value: unknown, pattern: string) {
  const text = value == null ? '' : String(value)
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')
  return new RegExp(`^${escaped}$`, 'i').test(text)
}

function applyFilters(rows: DevRow[], filters: Filter[]) {
  return filters.reduce((acc, filter) => {
    switch (filter.type) {
      case 'eq':
        return acc.filter((row) => row?.[filter.column] === filter.value)
      case 'ilike':
        return acc.filter((row) => matchesIlike(row?.[filter.column], filter.value))
      case 'in':
        return acc.filter((row) => filter.values.includes(row?.[filter.column]))
      case 'gte':
        return acc.filter((row) => compareValues(row?.[filter.column], filter.value) >= 0)
      case 'lte':
        return acc.filter((row) => compareValues(row?.[filter.column], filter.value) <= 0)
      default:
        return acc
    }
  }, rows)
}

function applyOrdering(rows: DevRow[], order: OrderSpec[]) {
  if (order.length === 0) return rows
  const sorted = [...rows]
  sorted.sort((a, b) => {
    for (const spec of order) {
      const result = compareValues(a?.[spec.column], b?.[spec.column])
      if (result !== 0) return spec.ascending ? result : -result
    }
    return 0
  })
  return sorted
}

function pickColumns(row: DevRow, columns: string | null | undefined) {
  if (!columns || columns.trim() === '*' || columns.includes('count(')) return row
  const selected = columns
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return selected.reduce<Record<string, unknown>>((acc, column) => {
    acc[column] = row?.[column]
    return acc
  }, {})
}

function resolveTableAlias(table: string): DevTableName {
  return table as DevTableName
}

type SingleRow<TData> = TData extends Array<infer TRow> ? TRow : TData

class DevQueryBuilder<TData = unknown> implements AppQueryBuilder<TData> {
  private filters: Filter[] = []

  private orderSpecs: OrderSpec[] = []

  private limitValue: number | null = null

  private selectColumns: string | null = null

  private head = false

  private countMode: 'exact' | 'planned' | 'estimated' | null = null

  private expectSingle = false

  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select'

  private insertRows: DevRow[] = []

  private updateValues: DevRow = {}

  constructor(private backend: DevSupabaseBackend, private table: DevTableName) {}

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.operation = this.operation === 'select' ? 'select' : this.operation
    this.selectColumns = columns
    this.head = Boolean(options?.head)
    this.countMode = options?.count ?? null
    return this
  }

  insert(values: DevRow | DevRow[]) {
    this.operation = 'insert'
    this.insertRows = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: DevRow) {
    this.operation = 'update'
    this.updateValues = values
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  ilike(column: string, value: string) {
    this.filters.push({ type: 'ilike', column, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: 'in', column, values })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ type: 'gte', column, value })
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push({ type: 'lte', column, value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderSpecs.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  limit(value: number) {
    this.limitValue = value
    return this
  }

  single(): AppQueryBuilder<SingleRow<TData>> {
    this.expectSingle = true
    return this as unknown as AppQueryBuilder<SingleRow<TData>>
  }

  async then<TResult1 = QueryResult<TData>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<TData>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<QueryResult<TData>> {
    const db = normalizeDevDb(await this.backend.readDb())
    const tableKey = resolveTableAlias(this.table)
    const rows = db[tableKey] ?? []

    if (this.operation === 'insert') {
      const inserted = this.insertRows.map((row) => {
        const nextRow = { ...row }
        if (!nextRow.id) nextRow.id = createDevId()
        if (!nextRow.created_at) nextRow.created_at = new Date().toISOString()
        return nextRow
      })
      db[tableKey] = [...rows, ...inserted]
      await this.backend.writeDb(db)
      const data = this.expectSingle ? inserted[0] ?? null : inserted
      return { data: data as TData, error: null, count: inserted.length }
    }

    const filteredRows = applyOrdering(applyFilters(rows, this.filters), this.orderSpecs)
    const totalCount = filteredRows.length
    const pagedRows = this.limitValue == null ? filteredRows : filteredRows.slice(0, this.limitValue)

    if (this.operation === 'update') {
      const updatedRows = rows.map((row) => {
        const matches = applyFilters([row], this.filters).length > 0
        return matches ? { ...row, ...this.updateValues } : row
      })
      db[tableKey] = updatedRows
      await this.backend.writeDb(db)
      const resultRows = applyFilters(updatedRows, this.filters)
      const data = this.expectSingle ? resultRows[0] ?? null : resultRows
      return { data: data as TData, error: null, count: resultRows.length }
    }

    if (this.operation === 'delete') {
      const deletedRows = applyFilters(rows, this.filters)
      db[tableKey] = rows.filter((row) => !deletedRows.includes(row))
      await this.backend.writeDb(db)
      const data = this.expectSingle ? deletedRows[0] ?? null : deletedRows
      return { data: data as TData, error: null, count: deletedRows.length }
    }

    const mappedRows = pagedRows.map((row) => pickColumns(row, this.selectColumns))
    const finalData = this.expectSingle ? mappedRows[0] ?? null : mappedRows
    const count = this.head ? totalCount : this.countMode === 'exact' ? totalCount : null
    return {
      data: this.head ? null : finalData as TData,
      error: null,
      count,
    }
  }
}

export class DevSupabaseClient implements AppSupabaseClient {
  constructor(private backend: DevSupabaseBackend) {}

  from<TTable extends keyof AppTableDataMap>(table: TTable): AppQueryBuilder<AppTableDataMap[TTable]>
  from<TData = unknown>(table: string): AppQueryBuilder<TData>
  from(table: string): AppQueryBuilder<unknown> {
    return new DevQueryBuilder(this.backend, resolveTableAlias(table))
  }
}

export function createDevSupabaseClient(backend: DevSupabaseBackend) {
  return new DevSupabaseClient(backend)
}
