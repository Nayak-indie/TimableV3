export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const result = await supabase.from('class_subject_links').select('class_id, subject_id')
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: result.data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const payload = await request.json().catch(() => null)

  const classId = typeof payload?.classId === 'string' ? payload.classId : null
  const subjectIds = Array.isArray(payload?.subjectIds) ? (payload.subjectIds as unknown[]) : null
  if (!classId || !subjectIds) {
    return NextResponse.json({ ok: false, error: 'Expected { classId, subjectIds }.' }, { status: 400 })
  }

  const deleteResult = await supabase.from('class_subject_links').delete().eq('class_id', classId)
  if (deleteResult.error) {
    return NextResponse.json({ ok: false, error: deleteResult.error.message }, { status: 500 })
  }

  const rows = subjectIds
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((subjectId) => ({ class_id: classId, subject_id: subjectId }))

  if (rows.length > 0) {
    const insertResult = await supabase.from('class_subject_links').insert(rows)
    if (insertResult.error) {
      return NextResponse.json({ ok: false, error: insertResult.error.message }, { status: 500 })
    }
  }

  revalidatePath('/setup')
  revalidatePath('/setup/classes')
  revalidatePath('/setup/subjects')
  return NextResponse.json({ ok: true })
}

