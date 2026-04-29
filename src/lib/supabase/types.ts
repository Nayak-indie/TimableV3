export interface QueryResult<T = any> {
  data: T | null
  error: null | Error
  count: number | null
}

export interface AppQueryBuilder<TData = any> extends PromiseLike<QueryResult<TData>> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): AppQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): AppQueryBuilder
  update(values: Record<string, unknown>): AppQueryBuilder
  delete(): AppQueryBuilder
  eq(column: string, value: unknown): AppQueryBuilder
  ilike(column: string, value: string): AppQueryBuilder
  in(column: string, values: unknown[]): AppQueryBuilder
  gte(column: string, value: unknown): AppQueryBuilder
  lte(column: string, value: unknown): AppQueryBuilder
  order(column: string, options?: { ascending?: boolean }): AppQueryBuilder
  limit(value: number): AppQueryBuilder
  single(): AppQueryBuilder
}

export interface AppSupabaseClient {
  from(table: string): AppQueryBuilder
}
