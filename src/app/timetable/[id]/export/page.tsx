'use client'

import { useMemo, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { AlertTriangle, Download, FileText, Printer, Users } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'
import type { Class, PeriodSlot, Subject, Teacher, TimetableEntry, Term } from '@/types'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
type ViewMode = 'class' | 'all' | 'teacher'

export default function ExportPage() {
  const params = useParams<{ id: string }>()
  const printRef = useRef<HTMLDivElement>(null)
  
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [slots, setSlots] = useState<PeriodSlot[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [term, setTerm] = useState<Term | null>(null)
  
  const [viewMode, setViewMode] = useState<ViewMode>('class')
  const [activeClassId, setActiveClassId] = useState('')
  const [activeTeacherId, setActiveTeacherId] = useState('')
  const [loading, setLoading] = useState(true)

  const loadExportData = async () => {
    setLoading(true)
    try {
      const [entriesRes, slotsRes, teachersRes, subjectsRes, classesRes, termRes] = await Promise.all([
        supabase.from('timetable_entries').select('*').eq('term_id', params.id),
        supabase.from('period_slots').select('*').order('number'),
        supabase.from('teachers').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('terms').select('*').eq('id', params.id).single(),
      ])

      const entryData = entriesRes.data ?? []
      const slotData = slotsRes.data ?? []
      const teacherData = teachersRes.data ?? []
      const subjectData = subjectsRes.data ?? []
      const classData = classesRes.data ?? []
      const termData = termRes.data ?? null

      setEntries(entryData)
      setSlots(slotData)
      setTeachers(teacherData)
      setSubjects(subjectData)
      setClasses(classData)
      setTerm(termData)

      if (classData.length > 0 && !activeClassId) setActiveClassId(classData[0].id)
      if (teacherData.length > 0 && !activeTeacherId) setActiveTeacherId(teacherData[0].id)
    } finally {
      setLoading(false)
    }
  }

  useDevDataSync(loadExportData, [params.id])

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Timetable_${term?.name ?? 'Export'}`,
  })

  const lessonSlots = useMemo(() => slots.filter((slot) => slot.slot_type === 'lesson'), [slots])
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])
  const teacherMap = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers])
  const subjectMap = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects])

  const activeClass = useMemo(() => classMap.get(activeClassId), [classMap, activeClassId])
  const activeTeacher = useMemo(() => teacherMap.get(activeTeacherId), [teacherMap, activeTeacherId])

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
        key={scope.title}
        className="mb-8 space-y-4 rounded-[28px] border border-[var(--border-color)] bg-white p-6 shadow-sm print:m-0 print:border-none print:shadow-none"
        style={{ breakAfter: 'page' }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{scope.title}</h2>
            <p className="text-sm text-gray-500 font-medium">{scope.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Timable Export</p>
            <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 p-3 text-left font-bold text-gray-700 w-24">Period</th>
                {DAYS.map((day) => (
                  <th key={day} className="border-b border-gray-200 p-3 text-left font-bold text-gray-700">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessonSlots.map((slot) => (
                <tr key={slot.id} className="group">
                  <td className="border-b border-gray-100 p-3 bg-gray-50/50">
                    <p className="font-bold text-gray-900">P{slot.number}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</p>
                  </td>
                  {DAYS.map((day) => {
                    const entry = entryLookup.get(`${day}-${slot.number}`)
                    const subject = entry?.subject_id ? subjectMap.get(entry.subject_id) : null
                    const teacher = entry?.teacher_id ? teacherMap.get(entry.teacher_id) : null
                    const classItem = entry?.class_id ? classMap.get(entry.class_id) : null

                    return (
                      <td
                        key={day}
                        className="border-b border-gray-100 p-3 transition-colors group-hover:bg-gray-50/30"
                        style={{ backgroundColor: subject ? `${subject.color_label}08` : undefined }}
                      >
                        {entry && subject ? (
                          <div className="space-y-1 overflow-hidden">
                            <p className="font-bold text-[13px] leading-tight truncate" style={{ color: subject.color_label }}>
                              {subject.name}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium truncate">
                              {scope.variant === 'teacher' ? (
                                <><FileText size={10} className="shrink-0" /> <span className="truncate">{classItem?.name ?? ''}</span></>
                              ) : (
                                <><Users size={10} className="shrink-0" /> <span className="truncate">{teacher?.name ?? ''}</span></>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-300 italic">Free</span>
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
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <Card className="no-print space-y-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Printer className="text-indigo-600" size={24} />
              Export Timetable
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {term?.name ?? 'Term'} | Choose a schedule type and download as PDF.
            </p>
          </div>
          <Button 
            onClick={() => handlePrint()} 
            className="h-12 px-8 shadow-indigo-200 shadow-lg"
            disabled={loading || entries.length === 0}
          >
            <Download size={18} className="mr-2" />
            Export PDF
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Scope</p>
            <select
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value="class">Single Class</option>
              <option value="all">All Classes</option>
              <option value="teacher">Teacher Schedule</option>
            </select>
          </div>

          {viewMode === 'class' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Select Class</p>
              <select
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900"
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
                {classes.length === 0 && <option disabled>No classes found</option>}
              </select>
            </div>
          )}

          {viewMode === 'teacher' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Select Teacher</p>
              <select
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900"
                value={activeTeacherId}
                onChange={(e) => setActiveTeacherId(e.target.value)}
              >
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
                {teachers.length === 0 && <option disabled>No teachers found</option>}
              </select>
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading export data...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center space-y-4 border-dashed border-2">
          <div className="p-4 bg-amber-50 rounded-full text-amber-500">
            <AlertTriangle size={32} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">No timetable data found</p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              You haven't generated a timetable for this term yet. Please go to the Timetable tab and click "Generate".
            </p>
          </div>
        </Card>
      ) : (
        <div ref={printRef} className="print:p-0">
          <style>{`
            @media print {
              @page { size: auto; margin: 20mm; }
              body { background: white !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          {viewMode === 'class' && activeClass && (
            renderSchedule({
              title: activeClass.name,
              subtitle: `${term?.name ?? 'Term'} | Class Schedule`,
              entriesForView: filteredEntries,
              variant: 'class',
            })
          )}

          {viewMode === 'teacher' && activeTeacher && (
            renderSchedule({
              title: activeTeacher.name,
              subtitle: `${term?.name ?? 'Term'} | Teacher Schedule`,
              entriesForView: filteredEntries,
              variant: 'teacher',
            })
          )}

          {viewMode === 'all' && (
            <div className="space-y-8">
              {classes.map((cls) =>
                renderSchedule({
                  title: cls.name,
                  subtitle: `${term?.name ?? 'Term'} | All Classes Export`,
                  entriesForView: entries.filter((entry) => entry.class_id === cls.id),
                  variant: 'class',
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
