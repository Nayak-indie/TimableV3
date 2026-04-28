import Link from 'next/link'
import { CalendarPlus2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default async function TimetablePage() {
  const supabase = createServerSupabaseClient()
  const [termsResult, entriesResult] = await Promise.all([
    supabase.from('terms').select('*').order('start_date', { ascending: false }),
    supabase.from('timetable_entries').select('term_id,class_id'),
  ])
  const terms = termsResult.data ?? []
  const entries = entriesResult.data ?? []

  const byTerm = new Map<string, Set<string>>()
  entries.forEach((entry) => {
    if (!entry.term_id || !entry.class_id) return
    if (!byTerm.has(entry.term_id)) byTerm.set(entry.term_id, new Set<string>())
    byTerm.get(entry.term_id)?.add(entry.class_id)
  })

  return (
    <div className="p-4 space-y-3">
      <Link href="/timetable/generate"><Button fullWidth><CalendarPlus2 size={16} />Generate New Timetable</Button></Link>
      {terms.map((term) => (
        <Link key={term.id} href={`/timetable/${term.id}`}>
          <Card>
            <p className="font-semibold text-gray-800">{term.name}</p>
            <p className="text-xs text-gray-500 mt-1">{byTerm.get(term.id)?.size ?? 0} classes scheduled</p>
          </Card>
        </Link>
      ))}
      {terms.length === 0 ? (
        <Card><p className="text-sm text-gray-600">No terms yet. Add one in Supabase and generate timetable.</p></Card>
      ) : null}
    </div>
  )
}
