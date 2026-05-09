'use client'

import { Edit2, Settings, Trash2, Calendar } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import MoreOptions from '@/components/ui/MoreOptions'
import type { Term } from '@/types'

interface TermListProps {
  terms: Term[]
  classesByTerm: Record<string, number>
}

export default function TermList({ terms, classesByTerm }: TermListProps) {
  return (
    <div className="space-y-3">
      {terms.map((term) => (
        <div key={term.id} className="relative group">
          <Link href={`/timetable/${term.id}`}>
            <Card className="hover:border-[var(--accent-soft)] transition-colors pr-12">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Calendar size={18} />
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
                { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => alert('Rename term') },
                { label: 'Configure', icon: <Settings size={14} />, onClick: () => alert('Configure') },
                { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => alert('Remove term') },
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
