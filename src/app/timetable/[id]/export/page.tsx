'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'
import type { Class, PeriodSlot, Subject, Teacher, TimetableEntry, Term } from '@/types'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
type ViewMode = 'class' | 'all' | 'teacher'

export default function ExportPage() {
  const params = useParams<{ id: string }>()
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [slots, setSlots] = useState<PeriodSlot[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [term, setTerm] = useState<Term | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('class')
  const [activeClassId, setActiveClassId] = useState('')
  const [activeTeacherId, setActiveTeacherId] = useState('')

  const loadExportData = async () => {
    const [entriesRes, slotsRes, teachersRes, subjectsRes, classesRes, termRes] = await Promise.all([
      supabase.from('timetable_entries').select('*').eq('term_id', params.id),
      supabase.from('period_slots').select('*').order('number'),
      supabase.from('teachers').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('terms').select('*').eq('id', params.id).single(),
    ])
    setEntries(entriesRes.data ?? [])
    setSlots(slotsRes.data ?? [])
    setTeachers(teachersRes.data ?? [])
    setSubjects(subjectsRes.data ?? [])
    const classData = classesRes.data ?? []
    const teacherData = teachersRes.data ?? []
    setClasses(classData)
    setTerm(termRes.data ?? null)
    if (classData.length > 0) setActiveClassId((current) => current || classData[0].id)
    if (teacherData.length > 0) setActiveTeacherId((current) => current || teacherData[0].id)
  }

  useDevDataSync(loadExportData, [params.id])

  const lessonSlots = useMemo(() => slots.filter((slot) => slot.slot_type === 'lesson'), [slots])
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])
  const teacherMap = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers])
  const subjectMap = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects])

  const activeClass = classMap.get(activeClassId) ?? null
  const activeTeacher = teacherMap.get(activeTeacherId) ?? null

  const filteredEntries = useMemo(() => {
    if (viewMode === 'teacher') {
      return activeTeacherId ? entries.filter((entry) => entry.teacher_id === activeTeacherId) : []
    }
    if (viewMode === 'class') {
      return activeClassId ? entries.filter((entry) => entry.class_id === activeClassId) : []
    }
    return entries
  }, [activeClassId, activeTeacherId, entries, viewMode])

  const renderSchedule = (scope: {
    title: string
    subtitle: string
    entriesForView: TimetableEntry[]
    variant: 'class' | 'teacher'
  }) => {
    const entryLookup = new Map(scope.entriesForView.map((entry) => [`${entry.day}-${entry.period_number}`, entry]))

    return (
      <section
        className="space-y-3 rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-primary)]"
        style={{ breakAfter: 'page' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">{scope.title}</p>
            <p className="text-xs text-[var(--text-secondary)]">{scope.subtitle}</p>
          </div>
          <p className="text-xs font-semibold text-[var(--accent)]">{scope.entriesForView.length} periods</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-[var(--surface-secondary)]">
              <tr>
                <th className="border-b border-[var(--border-color)] p-2 text-left">Period</th>
                {DAYS.map((day) => (
                  <th key={day} className="border-b border-[var(--border-color)] p-2 text-left">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessonSlots.map((slot) => (
                <tr key={slot.id} className="align-top">
                  <td className="border-b border-[var(--border-color)] p-2">
                    <p className="font-semibold text-[var(--text-primary)]">P{slot.number}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</p>
                  </td>
                  {DAYS.map((day) => {
                    const entry = entryLookup.get(`${day}-${slot.number}`)
                    const subject = entry?.subject_id ? subjectMap.get(entry.subject_id) : null
                    const teacher = entry?.teacher_id ? teacherMap.get(entry.teacher_id) : null
                    const classItem = entry?.class_id ? classMap.get(entry.class_id) : null

                    return (
                      <td
                        key={day}
                        className="border-b border-[var(--border-color)] p-2"
                        style={{ backgroundColor: subject ? `${subject.color_label}14` : 'var(--surface-secondary)' }}
                      >
                        {entry && subject ? (
                          <>
                            <p className="font-semibold" style={{ color: subject.color_label }}>
                              {subject.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              {scope.variant === 'teacher' ? classItem?.name ?? '' : teacher?.name ?? ''}
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] font-medium text-[var(--text-secondary)]">Free period</p>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <div className="p-4 space-y-4 print:p-0">
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <Card className="no-print space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Timetable export</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {term?.name ?? 'Term'} | choose a class, all classes, or a teacher schedule to print.
            </p>
          </div>
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
            Export scope
            <select
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)]"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value="class">Single class timetable</option>
              <option value="all">All class timetables</option>
              <option value="teacher">Teacher timetable</option>
            </select>
          </label>

          {viewMode === 'class' ? (
            <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              Class
              <select
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)]"
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          {viewMode === 'teacher' ? (
            <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              Teacher
              <select
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)]"
                value={activeTeacherId}
                onChange={(e) => setActiveTeacherId(e.target.value)}
              >
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </Card>

      {viewMode === 'class' ? (
        activeClass ? (
          renderSchedule({
            title: activeClass.name,
            subtitle: `${term?.name ?? 'Term'} | Class schedule`,
            entriesForView: filteredEntries,
            variant: 'class',
          })
        ) : null
      ) : null}

      {viewMode === 'teacher' ? (
        activeTeacher ? (
          renderSchedule({
            title: activeTeacher.name,
            subtitle: `${term?.name ?? 'Term'} | Teacher schedule`,
            entriesForView: filteredEntries,
            variant: 'teacher',
          })
        ) : null
      ) : null}

      {viewMode === 'all' ? (
        <div className="space-y-4">
          {classes.map((cls) =>
            renderSchedule({
              title: cls.name,
              subtitle: `${term?.name ?? 'Term'} | All classes export`,
              entriesForView: entries.filter((entry) => entry.class_id === cls.id),
              variant: 'class',
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
