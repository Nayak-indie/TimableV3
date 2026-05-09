'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, ChevronRight, LayoutGrid, Sparkles, Wand2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import type { Class, DayOfWeek, Term } from '@/types'
import Card from '@/components/ui/Card'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'
import EmptyState from '@/components/ui/EmptyState'
import { appendHistoryEvent, readAppMemory, updateSessionState } from '@/lib/app-memory'
import { getCurrentDay } from '@/lib/utils'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function GenerateTimetablePage() {
  const router = useRouter()
  const memory = readAppMemory()
  
  const [termId, setTermId] = useState(memory.session.lastTermId ?? '')
  const [terms, setTerms] = useState<Term[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  
  const [selectedClasses, setSelectedClasses] = useState<string[]>(memory.session.lastSelectedClassIds ?? [])
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  
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

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) 
        ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) 
        : [...prev, day]
      return next
    })
  }

  const selectAllClasses = () => {
    const allIds = classes.map(c => c.id)
    const next = selectedClasses.length === allIds.length ? [] : allIds
    setSelectedClasses(next)
    updateSessionState({ lastSelectedClassIds: next })
  }

  const onGenerate = async () => {
    if (!termId || selectedClasses.length === 0 || selectedDays.length === 0) {
      setError('Select a term, at least one class, and at least one day.')
      return
    }
    setError('')
    setIsSubmitting(true)
    
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        termId, 
        classIds: selectedClasses, 
        days: selectedDays,
        scope: selectedDays.length === 5 ? 'week' : 'custom'
      }),
    })

    if (response.ok) {
      const payload = await response.json().catch(() => null)
      updateSessionState({
        lastTermId: termId,
        lastSelectedClassIds: selectedClasses,
      })
      appendHistoryEvent({
        type: 'timetable_generated',
        title: 'Timetable generated',
        details: `${payload?.entriesCreated ?? 0} periods updated across ${selectedDays.length} days`,
        payload: payload ?? undefined,
      })
      emitDevDataSync()
      router.push(`/timetable/${termId}?day=${selectedDays[0]}`)
      return
    }
    
    const payload = await response.json().catch(() => ({ error: 'Failed to generate timetable.' }))
    setError(payload.error ?? 'Failed to generate timetable.')
    setIsSubmitting(false)
  }

  const isAllClassesSelected = classes.length > 0 && selectedClasses.length === classes.length

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto pb-24">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wand2 className="text-indigo-600" size={24} />
          Generator
        </h1>
        <p className="text-sm text-gray-500 font-medium">Build your schedule by selecting classes and days.</p>
      </div>

      <Card className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Academic Term</p>
          <select
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
            value={termId}
            onChange={(e) => {
              setTermId(e.target.value)
              updateSessionState({ lastTermId: e.target.value })
            }}
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
            {terms.length === 0 && <option disabled>No terms found</option>}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Days to Generate</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`flex-1 min-w-[60px] h-12 rounded-2xl border-2 transition-all flex items-center justify-center text-sm font-bold ${
                  selectedDays.includes(day)
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)] shadow-lg shadow-[var(--accent-soft)]'
                    : 'bg-[var(--surface-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-700">Select Classes</h2>
          </div>
          <button 
            onClick={selectAllClasses}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {isAllClassesSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {terms.length === 0 || classes.length === 0 ? (
          <EmptyState
            title="Prerequisites missing"
            description="You need to add at least one term and one class before you can generate a timetable."
            preview={(
              <div className="grid grid-cols-2 gap-2 mt-4 opacity-40">
                <div className="h-12 rounded-2xl bg-indigo-50 animate-pulse" />
                <div className="h-12 rounded-2xl bg-indigo-50 animate-pulse" />
              </div>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {classes.map((cls) => {
              const isSelected = selectedClasses.includes(cls.id)
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  className={`relative flex items-center gap-3 p-4 rounded-3xl border-2 text-left transition-all group ${
                    isSelected 
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm' 
                      : 'bg-[var(--surface-primary)] border-[var(--border-color)] hover:border-[var(--accent-soft)]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--surface-primary)] border-[var(--border-color)]'
                  }`}>
                    {isSelected && <Check size={14} strokeWidth={4} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {cls.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] opacity-60 font-medium uppercase tracking-tight">Grade {cls.grade_level}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute right-3 top-3">
                      <Sparkles size={12} className="text-[var(--accent)] opacity-40" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <Card className="bg-red-50 border-red-100 flex items-start gap-3 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="mt-0.5 text-red-500"><CheckCircle2 size={16} /></div>
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <Button 
            fullWidth 
            onClick={onGenerate} 
            disabled={isSubmitting || classes.length === 0}
            className="h-14 shadow-xl shadow-indigo-100"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Timetable...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wand2 size={18} />
                <span>Generate for {selectedClasses.length} classes</span>
                <ChevronRight size={16} className="opacity-50" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
