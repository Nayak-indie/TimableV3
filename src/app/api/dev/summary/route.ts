export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const weekDate = new Date()
  weekDate.setDate(weekDate.getDate() + 7)
  const nextWeek = weekDate.toISOString().slice(0, 10)

  const [
    termRes,
    classesRes,
    teachersRes,
    subjectsRes,
    slotsRes,
    entriesRes,
    eventsRes,
  ] = await Promise.all([
    supabase.from('terms').select('name').eq('is_active', true).limit(1),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('subjects').select('id', { count: 'exact', head: true }),
    supabase.from('period_slots').select('id', { count: 'exact', head: true }),
    supabase.from('timetable_entries').select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('event_date', today)
      .lte('event_date', nextWeek),
  ])

  return NextResponse.json({
    activeTerm: termRes.data?.[0]?.name ?? 'Not set',
    classes: classesRes.count ?? 0,
    teachers: teachersRes.count ?? 0,
    subjects: subjectsRes.count ?? 0,
    periodSlots: slotsRes.count ?? 0,
    timetableEntries: entriesRes.count ?? 0,
    events: eventsRes.count ?? 0,
  })
}
