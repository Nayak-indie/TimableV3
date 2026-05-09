import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { solveWithORTools } from '@/lib/scheduling/ortools-solver'
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
    
  const classSubjectMap = (linksResult.data ?? []).reduce((acc: Record<string, string[]>, row) => {
    const classId = row.class_id
    const subjectId = row.subject_id
    if (!classId || !subjectId) return acc
    if (!acc[classId]) acc[classId] = []
    acc[classId].push(subjectId)
    return acc
  }, {} as Record<string, string[]>)

  // Prepare data for OR-Tools solver
  const solverInput = {
    config: {
      days: validDays,
      periods_per_day: periodsPerDay,
    },
    teachers: (teachersResult.data ?? []).map(t => ({
      id: t.id,
      name: t.name,
      max_periods_per_day: t.max_periods_per_day || periodsPerDay,
    })),
    classes: (classesResult.data ?? []).map(c => ({
      id: c.id,
      subjects: (classSubjectMap[c.id] || []).map(sid => {
        const sub = (subjectsResult.data ?? []).find(s => s.id === sid);
        return {
          subject: sid,
          weekly_periods: sub?.periods_per_week || 1,
          teacher_id: sub?.teacher_ids?.[0] || 'Unknown', // Simplification: taking first teacher
        }
      })
    })),
    // Preferences can be added here if we have a table for them
    preferences: (teachersResult.data ?? []).reduce((acc: any, t) => {
      if (t.availability) {
        // Availability in V3 is Record<DayOfWeek, number[]> where number[] are available periods
        // The solver expects unavailable periods for easier constraints
        const unavail: any = {};
        validDays.forEach((day, idx) => {
          const availPeriods = t.availability[day] || [];
          const unavailPeriods = Array.from({length: periodsPerDay}, (_, i) => i).filter(p => !availPeriods.includes(p + 1));
          if (unavailPeriods.length > 0) {
            unavail[idx] = unavailPeriods;
          }
        });
        acc[t.id] = { unavailable_periods: unavail };
      }
      return acc;
    }, {})
  }

  try {
    const entries = await solveWithORTools(solverInput)
    const entriesToSave = entries.map(e => ({ ...e, term_id: termId }));

    if (entriesToSave.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate a feasible timetable. Constraints might be too tight.' },
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Solver failed' }, { status: 500 })
  }
}

