import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default async function ChangesPage() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const [eventsResult, overridesResult] = await Promise.all([
    supabase.from('events').select('*').gte('event_date', today).order('event_date', { ascending: true }).limit(8),
    supabase.from('timetable_entries').select('*').eq('is_override', true).order('created_at', { ascending: false }).limit(8),
  ])

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2 no-print">
        <Link href="/changes/events"><Button fullWidth variant="ghost">All Events</Button></Link>
        <Link href="/changes/events/new"><Button fullWidth>Add Event</Button></Link>
      </div>
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Upcoming events</p>
        {(eventsResult.data ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No upcoming events.</p>
        ) : (
          (eventsResult.data ?? []).map((event) => (
            <div key={event.id} className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{event.name}</p>
              <Badge label={event.event_type} />
            </div>
          ))
        )}
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Recent overrides</p>
        {(overridesResult.data ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No overrides applied yet.</p>
        ) : (
          (overridesResult.data ?? []).map((override) => (
            <p key={override.id} className="text-sm text-gray-600">
              {override.day} period {override.period_number} | class {override.class_id}
            </p>
          ))
        )}
      </Card>
    </div>
  )
}
