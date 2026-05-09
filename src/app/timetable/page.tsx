export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { CalendarPlus2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { Term } from '@/types'

import TermList from '@/components/timetable/TermList'

export default async function TimetablePage() {
  const supabase = createServerSupabaseClient()
  const [termsResult, entriesResult] = await Promise.all([
    supabase.from('terms').select('*').order('start_date', { ascending: false }),
    supabase.from('timetable_entries').select('term_id,class_id'),
  ])
  const terms = (termsResult.data ?? []) as Term[]
  const entries = (entriesResult.data ?? []) as Array<{ term_id?: string | null; class_id?: string | null }>

  const byTerm = new Map<string, Set<string>>()
  entries.forEach((entry) => {
    if (!entry.term_id || !entry.class_id) return
    if (!byTerm.has(entry.term_id)) byTerm.set(entry.term_id, new Set<string>())
    byTerm.get(entry.term_id)?.add(entry.class_id)
  })

  const classesByTerm: Record<string, number> = {}
  terms.forEach(t => {
    classesByTerm[t.id] = byTerm.get(t.id)?.size ?? 0
  })

  return (
    <div className="p-4 space-y-4">
      <Link href="/timetable/generate">
        <Button fullWidth className="h-14 shadow-lg shadow-[var(--accent-soft)]">
          <CalendarPlus2 size={18} className="mr-1" />
          Generate New Timetable
        </Button>
      </Link>
      
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60 ml-1">Existing Timetables</p>
        <TermList terms={terms} classesByTerm={classesByTerm} />
      </div>

      {terms.length === 0 && (
        <Card className="py-12 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-4 bg-[var(--surface-secondary)] rounded-full text-[var(--text-secondary)]">
            <CalendarPlus2 size={32} />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">No terms found. Start by generating your first timetable.</p>
        </Card>
      )}
    </div>
  )
}
