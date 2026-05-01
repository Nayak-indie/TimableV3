export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Event } from '@/types'

export default async function EventsPage() {
  const supabase = createServerSupabaseClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })

  const typedEvents = (events ?? []) as Event[]

  return (
    <div className="p-4 space-y-3">
      <Link href="/changes/events/new"><Button fullWidth>Add Event</Button></Link>
      {typedEvents.map((event) => (
        <Card key={event.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">{event.name}</p>
            <p className="text-xs text-gray-500">{event.event_date}</p>
          </div>
          <Badge label={event.event_type} />
        </Card>
      ))}
      {typedEvents.length === 0 ? <Card><p className="text-sm text-gray-600">No events added yet.</p></Card> : null}
    </div>
  )
}
