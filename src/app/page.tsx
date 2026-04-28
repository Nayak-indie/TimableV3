import Link from 'next/link'
import { CalendarDays, Plus, Settings, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import PersonalizedHeader from '@/components/dashboard/PersonalizedHeader'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const weekDate = new Date()
  weekDate.setDate(weekDate.getDate() + 7)
  const nextWeek = weekDate.toISOString().slice(0, 10)

  const [
    termsResult,
    classesResult,
    teachersResult,
    subjectsResult,
    entriesResult,
    eventsResult,
  ] = await Promise.all([
    supabase.from('terms').select('*').eq('is_active', true).limit(1),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('subjects').select('id', { count: 'exact', head: true }),
    supabase.from('timetable_entries').select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('*')
      .gte('event_date', today)
      .lte('event_date', nextWeek)
      .order('event_date', { ascending: true })
      .limit(4),
  ])

  const hasSetupData =
    (classesResult.count ?? 0) > 0 &&
    (teachersResult.count ?? 0) > 0 &&
    (subjectsResult.count ?? 0) > 0
  const setupSteps = [
    { label: 'Classes', done: (classesResult.count ?? 0) > 0 },
    { label: 'Teachers', done: (teachersResult.count ?? 0) > 0 },
    { label: 'Subjects', done: (subjectsResult.count ?? 0) > 0 },
    { label: 'Period slots', done: true },
    { label: 'Timetable', done: (entriesResult.count ?? 0) > 0 },
  ]
  const readiness = Math.round(
    (setupSteps.filter((step) => step.done).length / setupSteps.length) * 100
  )

  return (
    <div className="px-4 py-6 space-y-5 bg-gradient-to-b from-indigo-50/70 to-purple-50/40 min-h-full">
      <div>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        <h1 className="text-2xl font-bold text-gray-900">Timable</h1>
        <p className="text-sm text-gray-500 mt-1">Build and adjust weekly teacher-class schedules fast.</p>
        <PersonalizedHeader />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1">
          <CalendarDays size={18} className="text-indigo-500" />
          <p className="text-2xl font-bold">{entriesResult.count ?? 0}</p>
          <p className="text-xs text-gray-500">Scheduled entries</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <Sparkles size={18} className="text-violet-500" />
          <p className="text-2xl font-bold">{eventsResult.data?.length ?? 0}</p>
          <p className="text-xs text-gray-500">Events this week</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/timetable/generate"><Button fullWidth className="h-14"><Plus size={16} />New Timetable</Button></Link>
        <Link href="/setup"><Button fullWidth variant="secondary" className="h-14"><Settings size={16} />Setup Data</Button></Link>
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Status</p>
          <Badge label={hasSetupData ? 'Ready' : 'Needs setup'} variant={hasSetupData ? 'success' : 'warning'} />
        </div>
        <p className="text-xs text-gray-500">
          Active term: {termsResult.data?.[0]?.name ?? 'Not set'} | Classes: {classesResult.count ?? 0} |
          Teachers: {teachersResult.count ?? 0} | Subjects: {subjectsResult.count ?? 0}
        </p>
        <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${readiness}%` }} />
        </div>
        <p className="text-xs text-indigo-700 font-semibold">Timetable readiness: {readiness}%</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {setupSteps.map((step) => (
            <p key={step.label} className={step.done ? 'text-green-600' : 'text-gray-500'}>
              {step.done ? '✓' : '○'} {step.label}
            </p>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Upcoming events</p>
        {(eventsResult.data ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No events in the next 7 days.</p>
        ) : (
          <div className="space-y-2">
            {(eventsResult.data ?? []).map((event) => (
              <div key={event.id} className="flex items-center justify-between text-sm">
                <p className="font-medium text-gray-700">{event.name}</p>
                <Badge label={event.event_type} variant="default" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
