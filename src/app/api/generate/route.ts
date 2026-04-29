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

  const [termResult, linksResult] = await Promise.all([
    supabase.from('terms').select('working_days').eq('id', termId).single(),
    supabase.from('class_subject_links').select('class_id, subject_id').in('class_id', classIds),
  ])

  if (classesResult.error || teachersResult.error || subjectsResult.error || slotsResult.error || termResult.error || linksResult.error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const periodsPerDay = slotsResult.data?.length ?? 6
  const lessonSlotNumbers = (slotsResult.data ?? [])
    .map((slot: any) => slot.number)
    .filter((number: any) => typeof number === 'number')
  const classSubjectMap = (linksResult.data ?? []).reduce((acc: Record<string, string[]>, row: any) => {
    if (!acc[row.class_id]) acc[row.class_id] = []
    acc[row.class_id].push(row.subject_id)
    return acc
  }, {} as Record<string, string[]>)
  const entries = generateTimetable({
    termId,
    classes: classesResult.data ?? [],
    teachers: teachersResult.data ?? [],
    subjects: subjectsResult.data ?? [],
    periodsPerDay,
    lessonSlotNumbers,
    workingDays: termResult.data?.working_days ?? undefined,
    classSubjectMap,
  })
  if (entries.length === 0) {
    return NextResponse.json(
      { error: 'Could not place entries. Check teacher availability/limits and subject-teacher mapping.' },
      { status: 422 }
    )
  }

  await supabase.from('timetable_entries').delete().eq('term_id', termId).in('class_id', classIds)

  const { error: insertError } = await supabase.from('timetable_entries').insert(entries as any)
  if (insertError) {
    return NextResponse.json({ error: 'Failed to save timetable' }, { status: 500 })
  }

  return NextResponse.json({ success: true, entriesCreated: entries.length })
}
