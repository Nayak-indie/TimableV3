export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = createServerSupabaseClient()
  const result = await supabase.from('classes').select('*').eq('id', id).single()
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: result.data })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = createServerSupabaseClient()
  const payload = await request.json().catch(() => null)
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Missing payload.' }, { status: 400 })
  }

  const result = await supabase.from('classes').update(payload).eq('id', id).select('*').single()
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
  }

  revalidatePath('/setup')
  revalidatePath('/setup/classes')
  return NextResponse.json({ ok: true, data: result.data })
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = createServerSupabaseClient()
  const result = await supabase.from('classes').delete().eq('id', id)
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
  }

  revalidatePath('/setup')
  revalidatePath('/setup/classes')
  return NextResponse.json({ ok: true })
}

