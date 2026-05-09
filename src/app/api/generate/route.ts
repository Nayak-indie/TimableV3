import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { solveWithORTools } from '@/lib/scheduling/ortools-solver'
import { generateTimetable } from '@/lib/scheduling/generator'
import { PrerequisiteEngine } from '@/lib/scheduling/prerequisites'
import { PredictiveAnalyzer } from '@/lib/intelligence/predictive-analysis'
import { DelegationPolicy } from '@/lib/intelligence/delegation-policy'
import { HistoryEngine } from '@/lib/intelligence/history/execution-history'

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

  console.log(`[GENERATE_API_DEBUG] Classes: ${classesResult.data?.length}, Teachers: ${teachersResult.data?.length}, Subjects: ${subjectsResult.data?.length}, Links: ${linksResult.data?.length}`);
  console.log(`[GENERATE_API_DEBUG] Input classIds:`, classIds);


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
          teacher_id: sub?.teacher_ids?.[0] || 'Unknown',
        }
      })
    })),
    preferences: (teachersResult.data ?? []).reduce((acc: any, t) => {
      if (t.availability) {
        const unavail: any = {};
        validDays.forEach((day, idx) => {
          const availPeriods = t.availability[day] || [];
          const unavailPeriods = Array.from({length: periodsPerDay}, (_, i) => i).filter(p => !availPeriods.includes(p + 1));
          if (unavailPeriods.length > 0) unavail[idx] = unavailPeriods;
        });
        acc[t.id] = { unavailable_periods: unavail };
      }
      return acc;
    }, {})
  }

  // --- ADAPTIVE OPTIMIZATION ROUTING ---
  const prereqEngine = new PrerequisiteEngine({
    // In production, these would be fetched from a DB table
    'physics_id': ['math_id'], 
    'organic_chem_id': ['chem_bonding_id']
  })

  const analyzer = new PredictiveAnalyzer(
    teachersResult.data ?? [],
    classesResult.data ?? [],
    subjectsResult.data ?? [],
    classSubjectMap,
    prereqEngine
  )

  const intelligence = analyzer.analyze()
  const decision = DelegationPolicy.decide(
    intelligence.forecast,
    intelligence.resourcePressure,
    intelligence.dependencyRisk
  )

  const executionTrace = {
    termId,
    mode: decision.mode,
    reasoning: decision.reasoning,
    strategy: decision.strategy,
    forecastProbability: intelligence.forecast.probability,
    timestamp: new Date().toISOString()
  }

  console.log(`[ORCHESTRATOR] Routing to ${decision.mode}: ${decision.reasoning}`)
  const startTime = Date.now()

  try {
    let entries: any[] = []
    let fallbackTriggered = false

    // ROUTING LOGIC
    if (decision.mode === 'EMERGENCY_DRAFT') {
      entries = generateTimetable({
        termId,
        classes: classesResult.data ?? [],
        teachers: teachersResult.data ?? [],
        subjects: subjectsResult.data ?? [],
        periodsPerDay,
        lessonSlotNumbers: Array.from({length: periodsPerDay}, (_, i) => i + 1),
        workingDays: validDays,
        classSubjectMap,
      })
    } else {
      entries = await solveWithORTools(solverInput)
    }

    const solveTimeMs = Date.now() - startTime

    if (entries.length === 0) {
      console.warn('[ORCHESTRATOR] Primary mode failed. Triggering Emergency Recovery.')
      fallbackTriggered = true
      entries = generateTimetable({
        termId,
        classes: classesResult.data ?? [],
        teachers: teachersResult.data ?? [],
        subjects: subjectsResult.data ?? [],
        periodsPerDay,
        lessonSlotNumbers: Array.from({length: periodsPerDay}, (_, i) => i + 1),
        workingDays: validDays,
        classSubjectMap,
      })
    }

    const success = entries.length > 0
    
    // --- EXPERIENTIAL INTELLIGENCE: Persisting Trace ---
    await HistoryEngine.record({
      ...executionTrace,
      solveTimeMs,
      success,
      fallbackTriggered,
      bottlenecks: intelligence.forecast.bottlenecks
    })

    if (!success) {
      return NextResponse.json({ error: 'Could not generate a feasible timetable even with fallbacks.', trace: executionTrace }, { status: 422 })
    }

    const entriesToSave = entries.map(e => ({ ...e, term_id: termId }));

    // Atomic Save
    await supabase.from('timetable_entries').delete().eq('term_id', termId).in('class_id', classIds).in('day', validDays)
    const { error: insertError } = await supabase.from('timetable_entries').insert(entriesToSave as unknown as Record<string, unknown>[])
    
    if (insertError) throw new Error('Failed to save entries')

    return NextResponse.json({ 
      success: true, 
      days: validDays, 
      entriesCreated: entriesToSave.length,
      trace: { ...executionTrace, solveTimeMs, fallbackTriggered }
    })
  } catch (error: any) {
    // Record failure in history
    await HistoryEngine.record({
      ...executionTrace,
      solveTimeMs: Date.now() - startTime,
      success: false,
      fallbackTriggered: false,
      bottlenecks: [error.message || 'Unknown routing failure']
    })
    return NextResponse.json({ error: error.message || 'Routing failure', trace: executionTrace }, { status: 500 })
  }
}



