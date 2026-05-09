'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, MoreVertical, Trash2, Edit2, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import MoreOptions from '@/components/ui/MoreOptions'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase/client'
import type { Term } from '@/types'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

export default function TimetableList() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)

  const loadTerms = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('terms')
      .select('*')
      .order('start_date', { ascending: false })
    setTerms((data ?? []) as Term[])
    setLoading(false)
  }

  useDevDataSync(loadTerms)

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the timetable for "${name}"? This will delete all scheduled periods for this term.`)) return
    
    // Cascading delete should handle entries, but let's be explicit if RLS is off
    await supabase.from('timetable_entries').delete().eq('term_id', id)
    const { error } = await supabase.from('terms').delete().eq('id', id)
    
    if (error) alert('Failed to remove: ' + error.message)
    else loadTerms()
  }

  const handleRename = async (id: string, currentName: string) => {
    const next = prompt('Rename Timetable / Term:', currentName)
    if (!next || next === currentName) return
    const { error } = await supabase.from('terms').update({ name: next }).eq('id', id)
    if (error) alert('Failed to rename: ' + error.message)
    else loadTerms()
  }

  if (loading) return <Card className="h-32 animate-pulse bg-gray-50/50" />

  if (terms.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
          <CalendarDays size={16} className="text-indigo-500" />
          Your Timetables
        </h2>
      </div>

      <div className="grid gap-3">
        {terms.map((term) => (
          <Card key={term.id} className="p-0 overflow-hidden group border-none shadow-lg shadow-indigo-100/20 hover:shadow-indigo-200/40 transition-all duration-300">
            <div className="p-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${term.is_active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <CalendarDays size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-gray-900 truncate max-w-[180px]">{term.name.replace('[DEV_SAMPLE_TIMABLE_V3] ', '')}</p>
                    {term.is_active && <Badge label="Active" variant="success" className="scale-75 origin-left" />}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    {new Date(term.start_date).getFullYear()} - {new Date(term.end_date).getFullYear()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Link href={`/timetable/${term.id}`}>
                  <button className="p-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <ExternalLink size={18} />
                  </button>
                </Link>
                <MoreOptions 
                  options={[
                    { label: 'View Schedule', icon: <ArrowRight size={14} />, onClick: () => window.location.href = `/timetable/${term.id}` },
                    { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => handleRename(term.id, term.name) },
                    { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => handleRemove(term.id, term.name) },
                  ]}
                />
              </div>
            </div>
            <div className={`h-1 w-full ${term.is_active ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-gray-100'}`} />
          </Card>
        ))}
      </div>
    </div>
  )
}
