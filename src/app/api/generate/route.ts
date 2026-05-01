import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateTimetable } from '@/lib/scheduling/generator'
import type { DayOfWeek } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { termId, classIds, scope, day } = await request.json()
  if (!termId || !Array.isArray(classIds) || classIds.length === 0) {
    return NextResponse.json({ error: 'termId and classIds are required' }, { status: 400 })
  }

  const normalizedScope = scope === 'day' ? 'day' : 'week'
  const normalizedDay = (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as DayOfWeek[]).includes(day as DayOfWeek) ? (day as DayOfWeek) : null
  if (normalizedScope === 'day' && !normalizedDay) {
    return NextResponse.json({ error: 'day is required when scope is day' }, { status: 400 })
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
    .map((slot) => Number((slot as Record<string, unknown>)?.number))
    .filter((number) => Number.isFinite(number))
  const classSubjectMap = (linksResult.data ?? []).reduce((acc: Record<string, string[]>, row) => {
    const typedRow = row as Record<string, unknown>
    const classId = String(typedRow.class_id ?? '')
    const subjectId = String(typedRow.subject_id ?? '')
    if (!classId || !subjectId) return acc
    if (!acc[classId]) acc[classId] = []
    acc[classId].push(subjectId)
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

  const entriesToSave = normalizedScope === 'day' && normalizedDay ? entries.filter((entry) => entry.day === normalizedDay) : entries

  if (entriesToSave.length === 0) {
    return NextResponse.json(
      { error: 'Could not place entries. Check teacher availability/limits and subject-teacher mapping.' },
      { status: 422 }
    )
  }

  if (normalizedScope === 'day' && normalizedDay) {
    await supabase.from('timetable_entries').delete().eq('term_id', termId).in('class_id', classIds).eq('day', normalizedDay)
  } else {
    await supabase.from('timetable_entries').delete().eq('term_id', termId).in('class_id', classIds)
  }

  const { error: insertError } = await supabase.from('timetable_entries').insert(entriesToSave as unknown as Record<string, unknown>[])
  if (insertError) {
    return NextResponse.json({ error: 'Failed to save timetable' }, { status: 500 })
  }

  return NextResponse.json({ success: true, scope: normalizedScope, day: normalizedDay, entriesCreated: entriesToSave.length })
}
