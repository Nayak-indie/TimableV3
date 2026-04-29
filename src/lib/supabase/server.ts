import { createClient } from '@supabase/supabase-js'
import type { AppSupabaseClient } from './types'
import { createDevServerSupabaseClient, shouldUseDevStore } from '@/lib/dev/dev-supabase.server'

const realSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
) as unknown as AppSupabaseClient

export function createServerSupabaseClient(): AppSupabaseClient {
  if (shouldUseDevStore()) {
    return createDevServerSupabaseClient()
  }

  return realSupabase
}

