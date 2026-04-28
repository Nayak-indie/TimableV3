import { createClient } from '@supabase/supabase-js'
import { createDevServerSupabaseClient, shouldUseDevStore } from '@/lib/dev/dev-supabase.server'
const realSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

export function createServerSupabaseClient() {
  if (shouldUseDevStore()) {
    return createDevServerSupabaseClient() as typeof realSupabase
  }

  return realSupabase
}
