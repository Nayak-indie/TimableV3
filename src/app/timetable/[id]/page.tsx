'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import TimetableGrid from '@/components/timetable/TimetableGrid'
import { supabase } from '@/lib/supabase/client'
import type { Class, DayOfWeek, PeriodSlot, Subject, Teacher, TimetableEntry } from '@/types'
import { detectConflicts } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { readAppMemory, updateSessionState } from '@/lib/app-memory'

export default function TimetableDetailsPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [slots, setSlots] = useState<PeriodSlot[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [activeClassId, setActiveClassId] = useState('')

  const memory = readAppMemory()
  const dayParam = searchParams.get('day')
  const preferredDay = (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as DayOfWeek[]).includes(dayParam as DayOfWeek)
    ? (dayParam as DayOfWeek)
    : (memory.session.lastTimetableDay ?? undefined)

  const loadTimetable = async () => {
    const [entriesRes, slotsRes, teachersRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from('timetable_entries').select('*').eq('term_id', params.id),
      supabase.from('period_slots').select('*').order('number'),
      supabase.from('teachers').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('classes').select('*').order('name'),
    ])
    setEntries(entriesRes.data ?? [])
    setSlots(slotsRes.data ?? [])
    setTeachers(teachersRes.data ?? [])
    setSubjects(subjectsRes.data ?? [])
    const classData = (classesRes.data ?? []) as Class[]
    setClasses(classData)
    if (classData.length > 0) {
      const preferredClassId = memory.session.lastActiveClassId
      setActiveClassId(preferredClassId && classData.some((item) => item.id === preferredClassId) ? preferredClassId : classData[0].id)
    }
  }

  useDevDataSync(loadTimetable, [params.id])

  const filteredEntries = activeClassId
    ? entries.filter((entry) => entry.class_id === activeClassId)
    : []
  const conflicts = detectConflicts(entries)

  return (
    <div className="space-y-3">
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto">
        {classes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveClassId(item.id)
              updateSessionState({ lastActiveClassId: item.id })
            }}
            className={item.id === activeClassId ? 'rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm font-semibold' : 'rounded-xl bg-white text-gray-600 px-3 py-2 text-sm border border-gray-200'}
          >
            {item.name}
          </button>
        ))}
      </div>
      {conflicts.length > 0 ? (
        <Card className="mx-4 bg-amber-50 border-amber-200 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <p className="text-sm text-amber-700">{conflicts.length} teacher conflict(s) detected.</p>
        </Card>
      ) : null}
      <TimetableGrid key={preferredDay ?? 'Mon'} entries={filteredEntries} periodSlots={slots} teachers={teachers} subjects={subjects} initialDay={preferredDay} />
      <div className="px-4 pb-4">
        <Link href={`/timetable/${params.id}/export`}><Button fullWidth variant="secondary">Export / Print</Button></Link>
      </div>
    </div>
  )
}
