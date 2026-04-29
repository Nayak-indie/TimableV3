export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const result = await supabase.from('classes').select('*').order('name')
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: result.data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const payload = await request.json().catch(() => null)
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Missing payload.' }, { status: 400 })
  }

  const result = await supabase.from('classes').insert(payload).select('*').single()
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
  }

  revalidatePath('/setup')
  revalidatePath('/setup/classes')
  return NextResponse.json({ ok: true, data: result.data })
}

