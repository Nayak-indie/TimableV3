'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import type { Class, Term } from '@/types'
import Card from '@/components/ui/Card'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'
import EmptyState from '@/components/ui/EmptyState'

export default function GenerateTimetablePage() {
  const router = useRouter()
  const [termId, setTermId] = useState('')
  const [terms, setTerms] = useState<Term[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadOptions = async () => {
    const [termsRes, classesRes] = await Promise.all([
      supabase.from('terms').select('*').order('start_date', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
    ])
    const fetchedTerms = termsRes.data ?? []
    setTerms(fetchedTerms)
    setClasses(classesRes.data ?? [])
    if (fetchedTerms[0]) setTermId(fetchedTerms[0].id)
  }

  useDevDataSync(loadOptions)

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    )
  }

  const onGenerate = async () => {
    if (!termId || selectedClasses.length === 0) {
      setError('Select a term and at least one class.')
      return
    }
    setError('')
    setIsSubmitting(true)
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termId, classIds: selectedClasses }),
    })

    if (response.ok) {
      emitDevDataSync()
      router.push(`/timetable/${termId}`)
      return
    }
    const payload = await response.json().catch(() => ({ error: 'Failed to generate timetable.' }))
    setError(payload.error ?? 'Failed to generate timetable.')
    setIsSubmitting(false)
  }

  return (
    <div className="p-4 space-y-4">
      <select className="w-full px-4 py-3 rounded-xl border border-gray-200" value={termId} onChange={(e) => setTermId(e.target.value)}>
        {terms.map((term) => (
          <option key={term.id} value={term.id}>{term.name}</option>
        ))}
      </select>
      {terms.length === 0 || classes.length === 0 ? (
        <EmptyState
          title="Nothing ready to generate yet"
          description="Add a term and at least one class first. Once they exist, the generator list fills automatically."
          preview={(
            <div className="grid gap-2">
              <div className="h-10 rounded-xl bg-indigo-50 border border-indigo-100" />
              <div className="h-10 rounded-xl bg-indigo-50 border border-indigo-100" />
            </div>
          )}
        />
      ) : null}
      <div className="space-y-2">
        {classes.map((cls) => (
          <label key={cls.id} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl">
            <input type="checkbox" checked={selectedClasses.includes(cls.id)} onChange={() => toggleClass(cls.id)} />
            <span>{cls.name}</span>
          </label>
        ))}
      </div>
      {error ? <Card className="bg-red-50 border-red-200"><p className="text-sm text-red-600">{error}</p></Card> : null}
      <Button fullWidth onClick={onGenerate} disabled={isSubmitting}>{isSubmitting ? 'Generating...' : 'Generate Timetable'}</Button>
    </div>
  )
}
