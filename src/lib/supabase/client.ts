import { createClient } from '@supabase/supabase-js'
import { createDevBrowserSupabaseClient, shouldUseDevStore } from '@/lib/dev/dev-supabase.client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
const realSupabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabase = shouldUseDevStore()
  ? (createDevBrowserSupabaseClient() as typeof realSupabase)
  : realSupabase
