'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, ChevronRight, LayoutGrid, Sparkles, Wand2, Calendar, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import type { Class, DayOfWeek, Term } from '@/types'
import Card from '@/components/ui/Card'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'
import EmptyState from '@/components/ui/EmptyState'
import { appendHistoryEvent, readAppMemory, updateSessionState } from '@/lib/app-memory'

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
        : [...prev, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
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
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          termId, 
          classIds: selectedClasses, 
          days: selectedDays,
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAllClassesSelected = classes.length > 0 && selectedClasses.length === classes.length

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto pb-32">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
            <Wand2 size={24} />
          </div>
          Generator
        </h1>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest ml-1 opacity-70">AI-Powered Scheduling Engine</p>
      </div>

      <div className="grid gap-6">
        <Card className="space-y-6 border-none shadow-xl shadow-indigo-100/50 p-6 bg-gradient-to-br from-white to-indigo-50/10">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Academic Term</p>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <select
                className="w-full h-14 rounded-2xl border border-gray-100 bg-white pl-12 pr-4 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
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
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Days to Generate</p>
            <div className="flex gap-2">
              {DAYS.map((day) => {
                const isActive = selectedDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 h-14 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-white border-gray-50 text-gray-400 hover:border-indigo-100'
                    }`}
                  >
                    <span className="text-xs font-black uppercase">{day}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-indigo-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Select Classes</h2>
            </div>
            <button 
              onClick={selectAllClasses}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${
                isAllClassesSelected 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-white text-gray-400 border border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {isAllClassesSelected ? 'Deselect All' : 'Select All Classes'}
            </button>
          </div>

          {terms.length === 0 || classes.length === 0 ? (
            <EmptyState
              title="Prerequisites missing"
              description="You need to add at least one term and one class before you can generate a timetable."
              preview={(
                <div className="grid grid-cols-2 gap-3 mt-6 opacity-40">
                  <div className="h-16 rounded-3xl bg-indigo-50 animate-pulse" />
                  <div className="h-16 rounded-3xl bg-indigo-50 animate-pulse" />
                </div>
              )}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {classes.map((cls) => {
                const isSelected = selectedClasses.includes(cls.id)
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={`relative flex items-center gap-4 p-5 rounded-[32px] border-2 text-left transition-all group overflow-hidden ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-600 shadow-xl shadow-indigo-100/20' 
                        : 'bg-white border-gray-50 hover:border-indigo-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isSelected ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-300'
                    }`}>
                      <Check size={18} strokeWidth={4} className={`transition-transform duration-300 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[15px] font-extrabold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {cls.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 opacity-60">Grade {cls.grade_level}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute -right-2 -bottom-2 opacity-10 text-indigo-600">
                        <Sparkles size={48} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-100 flex items-start gap-4 p-5 rounded-3xl animate-in fade-in slide-in-from-top-4">
          <div className="mt-0.5 text-red-500 bg-white p-1.5 rounded-xl shadow-sm"><AlertTriangle size={18} /></div>
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-widest text-red-700">Generation Error</p>
            <p className="text-sm font-semibold text-red-600/80">{error}</p>
          </div>
        </Card>
      )}

      <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
        <div className="pointer-events-auto animate-in slide-in-from-right-8 duration-500">
          <Button 
            onClick={onGenerate} 
            disabled={isSubmitting || classes.length === 0}
            className={`h-16 px-6 shadow-2xl transition-all duration-500 rounded-full text-base font-black tracking-tight flex items-center gap-4 ${
              isSubmitting ? 'bg-indigo-400 w-64' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-300/50 hover:scale-105 active:scale-95'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span className="uppercase tracking-widest text-xs">Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <Wand2 size={20} className="animate-pulse" />
                </div>
                <span>Generate Timetable</span>
                <div className="h-8 w-px bg-white/20 mx-1" />
                <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-full">
                  <span className="text-xs font-black">{selectedClasses.length}</span>
                  <LayoutGrid size={14} className="opacity-60" />
                </div>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
