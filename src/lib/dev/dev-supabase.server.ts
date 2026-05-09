import { createDevSupabaseClient, type DevSupabaseBackend } from './dev-supabase'
import { normalizeDevDb, shouldUseLocalDevStore, type DevDb } from './dev-db'
import { readDevDbFile, writeDevDbFile } from './dev-db.server'

class DevServerBackend implements DevSupabaseBackend {
  async readDb() {
    return normalizeDevDb(await readDevDbFile())
  }

  async writeDb(db: DevDb) {
    await writeDevDbFile(normalizeDevDb(db))
  }
}

export function createDevServerSupabaseClient() {
  return createDevSupabaseClient(new DevServerBackend())
}

export function shouldUseDevStore() {
  return shouldUseLocalDevStore()
}
