import { createClient } from '@supabase/supabase-js'
import type { AppSupabaseClient } from './types'
import { createDevServerSupabaseClient, shouldUseDevStore } from '@/lib/dev/dev-supabase.server'

export function createServerSupabaseClient(): AppSupabaseClient {
  if (shouldUseDevStore()) {
    return createDevServerSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  const apiKey = serviceKey && serviceKey.trim().length > 0 ? serviceKey : anonKey

  return createClient(supabaseUrl, apiKey) as unknown as AppSupabaseClient
}
