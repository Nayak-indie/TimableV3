import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateTimetable } from '@/lib/scheduling/generator'
import type { DayOfWeek } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { termId, classIds, days } = await request.json()
  
  if (!termId || !Array.isArray(classIds) || classIds.length === 0) {
    return NextResponse.json({ error: 'termId and classIds are required' }, { status: 400 })
  }

  const selectedDays = (Array.isArray(days) ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) as DayOfWeek[]
  const validDays = selectedDays.filter(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d))

  if (validDays.length === 0) {
    return NextResponse.json({ error: 'At least one valid day is required' }, { status: 400 })
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
    .map((slot) => Number(slot.number))
    .filter((number) => Number.isFinite(number))
    
  const classSubjectMap = (linksResult.data ?? []).reduce((acc: Record<string, string[]>, row) => {
    const classId = row.class_id
    const subjectId = row.subject_id
    if (!classId || !subjectId) return acc
    if (!acc[classId]) acc[classId] = []
    acc[classId].push(subjectId)
    return acc
  }, {} as Record<string, string[]>)

  // Generate full potential timetable
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

  // Filter only for selected days
  const entriesToSave = entries.filter((entry) => validDays.includes(entry.day as DayOfWeek))

  if (entriesToSave.length === 0) {
    return NextResponse.json(
      { error: 'Could not place entries for the selected days. Check teacher availability/limits.' },
      { status: 422 }
    )
  }

  // Atomically replace entries for selected classes on selected days
  await supabase
    .from('timetable_entries')
    .delete()
    .eq('term_id', termId)
    .in('class_id', classIds)
    .in('day', validDays)

  const { error: insertError } = await supabase.from('timetable_entries').insert(entriesToSave as unknown as Record<string, unknown>[])
  
  if (insertError) {
    return NextResponse.json({ error: 'Failed to save timetable' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    days: validDays, 
    entriesCreated: entriesToSave.length 
  })
}
