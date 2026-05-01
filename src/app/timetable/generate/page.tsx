'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import type { Class, DayOfWeek, Term } from '@/types'
import Card from '@/components/ui/Card'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'
import EmptyState from '@/components/ui/EmptyState'
import { appendHistoryEvent, readAppMemory, updateSessionState, type GenerateScope } from '@/lib/app-memory'
import { getCurrentDay } from '@/lib/utils'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function GenerateTimetablePage() {
  const router = useRouter()
  const memory = readAppMemory()
  const [termId, setTermId] = useState(memory.session.lastTermId ?? '')
  const [scope, setScope] = useState<GenerateScope>(memory.session.generateScope ?? 'week')
  const [terms, setTerms] = useState<Term[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>(memory.session.lastSelectedClassIds ?? [])
  const [focusDay, setFocusDay] = useState<DayOfWeek>(memory.session.generateDay ?? getCurrentDay())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadOptions = async () => {
    const [termsRes, classesRes] = await Promise.all([
      supabase.from('terms').select('*').order('start_date', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
    ])
    const fetchedTerms = (termsRes.data ?? []) as Term[]
    const fetchedClasses = (classesRes.data ?? []) as Class[]
    setTerms(fetchedTerms)
    setClasses(fetchedClasses)
    setTermId((prev) => {
      const preferred = memory.session.lastTermId
      if (preferred && fetchedTerms.some((term) => term.id === preferred)) return preferred
      return prev || fetchedTerms[0]?.id || ''
    })
    setSelectedClasses((prev) => {
      if (prev.length === 0) return prev
      const allowed = new Set(fetchedClasses.map((item) => item.id))
      return prev.filter((id) => allowed.has(id))
    })
  }

  useDevDataSync(loadOptions)

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) => {
      const next = prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
      updateSessionState({ lastSelectedClassIds: next })
      return next
    })
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
      body: JSON.stringify({ termId, classIds: selectedClasses, scope, day: focusDay }),
    })

    if (response.ok) {
      const payload = await response.json().catch(() => null)
      updateSessionState({
        lastTermId: termId,
        lastSelectedClassIds: selectedClasses,
        generateDay: focusDay,
        generateScope: scope,
      })
      appendHistoryEvent({
        type: 'timetable_generated',
        title: scope === 'day' ? 'Timetable generated (day)' : 'Timetable generated',
        details: payload?.entriesCreated ? `${payload.entriesCreated} periods created` : undefined,
        payload: payload ?? undefined,
      })
      emitDevDataSync()
      router.push(`/timetable/${termId}?day=${focusDay}`)
      return
    }
    const payload = await response.json().catch(() => ({ error: 'Failed to generate timetable.' }))
    appendHistoryEvent({
      type: 'timetable_generate_failed',
      title: 'Timetable generation failed',
      details: payload.error ?? 'Failed to generate timetable.',
      payload,
    })
    setError(payload.error ?? 'Failed to generate timetable.')
    setIsSubmitting(false)
  }

  return (
    <div className="p-4 space-y-4">
      <select
        className="w-full px-4 py-3 rounded-xl border border-gray-200"
        value={termId}
        onChange={(e) => {
          setTermId(e.target.value)
          updateSessionState({ lastTermId: e.target.value })
        }}
      >
        {terms.map((term) => (
          <option key={term.id} value={term.id}>{term.name}</option>
        ))}
      </select>

      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Generation scope
        <select
          className="mt-1 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)]"
          value={scope}
          onChange={(e) => {
            const next = (e.target.value === 'day' ? 'day' : 'week') as GenerateScope
            setScope(next)
            updateSessionState({ generateScope: next })
          }}
        >
          <option value="week">Full week (recommended)</option>
          <option value="day">Only selected day</option>
        </select>
      </label>

      <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] p-1 overflow-x-auto">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => {
              setFocusDay(day)
              updateSessionState({ generateDay: day })
            }}
            className={focusDay === day ? 'px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[var(--on-accent)]' : 'px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}
          >
            {day}
          </button>
        ))}
      </div>
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
