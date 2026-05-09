'use client'

import { Edit2, Settings, Trash2, Calendar, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import MoreOptions from '@/components/ui/MoreOptions'
import { supabase } from '@/lib/supabase/client'
import type { Term } from '@/types'

interface TermListProps {
  terms: Term[]
  classesByTerm: Record<string, number>
}

export default function TermList({ terms, classesByTerm }: TermListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleRename = async (term: Term) => {
    const newName = prompt('Enter new name for this timetable:', term.name)
    if (!newName || newName === term.name) return

    setLoadingId(term.id)
    try {
      const { error } = await supabase.from('terms').update({ name: newName }).eq('id', term.id)
      if (error) throw error
      router.refresh()
    } catch (err: any) {
      alert('Failed to rename: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const handleRemove = async (term: Term) => {
    if (!confirm(`Are you sure you want to remove "${term.name}"? This will delete all scheduled entries for this term.`)) return

    setLoadingId(term.id)
    try {
      // First delete entries (cascade should handle this but let's be safe if not configured)
      await supabase.from('timetable_entries').delete().eq('term_id', term.id)
      const { error } = await supabase.from('terms').delete().eq('id', term.id)
      if (error) throw error
      router.refresh()
    } catch (err: any) {
      alert('Failed to remove: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {terms.map((term) => (
        <div key={term.id} className={`relative group transition-opacity ${loadingId === term.id ? 'opacity-50' : ''}`}>
          <Link href={`/timetable/${term.id}`}>
            <Card className="hover:border-[var(--accent-soft)] transition-colors pr-12">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  {loadingId === term.id ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{term.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {classesByTerm[term.id] || 0} classes scheduled
                  </p>
                </div>
              </div>
            </Card>
          </Link>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <MoreOptions 
              options={[
                { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => handleRename(term) },
                { label: 'Configure', icon: <Settings size={14} />, onClick: () => alert('Configuration coming soon') },
                { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => handleRemove(term) },
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
