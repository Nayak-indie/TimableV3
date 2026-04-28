import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateTimetable } from '@/lib/scheduling/generator'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { termId, classIds } = await request.json()
  if (!termId || !Array.isArray(classIds) || classIds.length === 0) {
    return NextResponse.json({ error: 'termId and classIds are required' }, { status: 400 })
  }

  const [classesResult, teachersResult, subjectsResult, slotsResult] = await Promise.all([
    supabase.from('classes').select('*').in('id', classIds),
    supabase.from('teachers').select('*').eq('status', 'active'),
    supabase.from('subjects').select('*'),
    supabase.from('period_slots').select('*').eq('slot_type', 'lesson').order('number'),
  ])

  if (classesResult.error || teachersResult.error || subjectsResult.error || slotsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const periodsPerDay = slotsResult.data?.length ?? 6
  const entries = generateTimetable({
    termId,
    classes: classesResult.data ?? [],
    teachers: teachersResult.data ?? [],
    subjects: subjectsResult.data ?? [],
    periodsPerDay,
  })
  if (entries.length === 0) {
    return NextResponse.json(
      { error: 'Could not place entries. Check teacher availability/limits and subject-teacher mapping.' },
      { status: 422 }
    )
  }

  await supabase.from('timetable_entries').delete().eq('term_id', termId).in('class_id', classIds)

  const { error: insertError } = await supabase.from('timetable_entries').insert(entries)
  if (insertError) {
    return NextResponse.json({ error: 'Failed to save timetable' }, { status: 500 })
  }

  return NextResponse.json({ success: true, entriesCreated: entries.length })
}
