import { createDevSupabaseClient, type DevSupabaseBackend } from './dev-supabase'
import { normalizeDevDb, shouldUseLocalDevStore, type DevDb } from './dev-db'
import type { AppSupabaseClient } from '../supabase/types'

class DevBrowserBackend implements DevSupabaseBackend {
  async readDb() {
    const response = await fetch('/api/dev/store', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    return normalizeDevDb(payload?.db)
  }

  async writeDb(db: DevDb) {
    await fetch('/api/dev/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db }),
    })
  }
}

export function createDevBrowserSupabaseClient(): AppSupabaseClient {
  return createDevSupabaseClient(new DevBrowserBackend())
}

export function shouldUseDevStore() {
  return shouldUseLocalDevStore()
}
