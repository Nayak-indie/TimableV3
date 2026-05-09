import { createClient } from "@supabase/supabase-js";
import type { AppSupabaseClient } from "./types";
import {
  createDevBrowserSupabaseClient,
} from "@/lib/dev/dev-supabase.client";

/**
 * Ensure env vars exist
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Create real Supabase client
 */
const realSupabase: AppSupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
) as unknown as AppSupabaseClient;

/**
 * Decide whether to use dev store
 */
function shouldUseDevStore() {
  // 🚨 NEVER use dev-store in production
  if (process.env.NODE_ENV === "production") return false;

  // In development, fallback only if env is missing
  return false; // you can set true if you WANT dev-store locally
}

/**
 * Final exported client
 */
export const supabase: AppSupabaseClient = shouldUseDevStore()
  ? createDevBrowserSupabaseClient()
  : realSupabase;

/**
 * Debug (remove later)
 */
if (typeof window !== "undefined") {
  console.log(
    "[Supabase Client] Using dev-store:",
    shouldUseDevStore()
  );
}