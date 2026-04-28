'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import type { Class, PeriodSlot, Subject, Teacher, TimetableEntry, Term } from '@/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function ExportPage() {
  const params = useParams<{ id: string }>()
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [slots, setSlots] = useState<PeriodSlot[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [term, setTerm] = useState<Term | null>(null)
  const [activeClassId, setActiveClassId] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('timetable_entries').select('*').eq('term_id', params.id),
      supabase.from('period_slots').select('*').order('number'),
      supabase.from('teachers').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('terms').select('*').eq('id', params.id).single(),
    ]).then(([entriesRes, slotsRes, teachersRes, subjectsRes, classesRes, termRes]) => {
      setEntries(entriesRes.data ?? [])
      setSlots(slotsRes.data ?? [])
      setTeachers(teachersRes.data ?? [])
      setSubjects(subjectsRes.data ?? [])
      const classData = classesRes.data ?? []
      setClasses(classData)
      setTerm(termRes.data ?? null)
      if (classData.length > 0) setActiveClassId(classData[0].id)
    })
  }, [params.id])

  const classEntries = activeClassId
    ? entries.filter((entry) => entry.class_id === activeClassId)
    : entries
  const selectedClass = classes.find((item) => item.id === activeClassId)
  const cell = (day: string, period: number) =>
    classEntries.find((entry) => entry.day === day && entry.period_number === period)

  return (
    <div className="p-4">
      <style>{`@media print { nav, .no-print { display: none !important; } }`}</style>
      <div className="mb-3">
        <h1 className="text-lg font-bold text-gray-900">School Timetable</h1>
        <p className="text-xs text-gray-500">
          {selectedClass?.name ?? 'Class'} | {term?.name ?? 'Term'} | Generated {new Date().toLocaleDateString()}
        </p>
      </div>
      <div className="no-print mb-4 flex gap-2">
        <select
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          value={activeClassId}
          onChange={(e) => setActiveClassId(e.target.value)}
        >
          {classes.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead><tr><th className="border p-2">Period</th>{DAYS.map((day) => <th key={day} className="border p-2">{day}</th>)}</tr></thead>
        <tbody>
          {slots.filter((slot) => slot.slot_type === 'lesson').map((slot) => (
            <tr key={slot.id}>
              <td className="border p-2">
                <p className="font-semibold">P{slot.number}</p>
                <p className="text-[10px] text-gray-500">{slot.start_time.slice(0, 5)}</p>
              </td>
              {DAYS.map((day) => {
                const entry = cell(day, slot.number)
                const subject = subjects.find((item) => item.id === entry?.subject_id)
                const teacher = teachers.find((item) => item.id === entry?.teacher_id)
                return (
                  <td key={day} className="border p-2" style={{ backgroundColor: subject ? `${subject.color_label}14` : '#f8fafc' }}>
                    <p className="font-semibold" style={{ color: subject?.color_label ?? '#64748b' }}>{subject?.name ?? '-'}</p>
                    <p className="text-[10px] text-gray-600">{teacher?.name ?? ''}</p>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
