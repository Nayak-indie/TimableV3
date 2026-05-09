'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { AlertTriangle, Download, FileText, Printer, Users, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'
import type { Class, PeriodSlot, Subject, Teacher, TimetableEntry, Term, DayOfWeek } from '@/types'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
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
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
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

      setEntries(entriesRes.data ?? [])
      setSlots(slotsRes.data ?? [])
      setTeachers(teachersRes.data ?? [])
      setSubjects(subjectsRes.data ?? [])
      const classData = (classesRes.data ?? []) as Class[]
      setClasses(classData)
      setTerm(termRes.data ?? null)

      if (classData.length > 0 && !activeClassId) setActiveClassId(classData[0].id)
      const teacherData = teachersRes.data ?? []
      if (teacherData.length > 0 && !activeTeacherId) setActiveTeacherId(teacherData[0].id)
    } catch (err) {
      console.error('Export load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useDevDataSync(loadExportData, [params.id])

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Timetable_${term?.name ?? 'Export'}`,
  })

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) 
        : [...prev, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    )
  }

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
        className="mb-8 space-y-4 rounded-[32px] border border-gray-200 bg-white p-8 shadow-sm print:m-0 print:border-none print:shadow-none print:p-4"
        style={{ breakAfter: 'page' }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{scope.title}</h2>
            <p className="text-sm text-gray-500 font-semibold mt-1 uppercase tracking-wider">{scope.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Timable Premium</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200">
          <table className="w-full border-collapse text-sm table-fixed">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="border-b border-gray-200 p-4 text-left font-bold text-gray-400 w-24 uppercase text-[10px] tracking-widest">Period</th>
                {selectedDays.map((day) => (
                  <th key={day} className="border-b border-gray-200 p-4 text-left font-bold text-gray-900 uppercase text-[10px] tracking-widest">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessonSlots.map((slot) => (
                <tr key={slot.id} className="group transition-colors hover:bg-gray-50/30">
                  <td className="border-b border-gray-100 p-4 bg-gray-50/30">
                    <p className="font-bold text-gray-900">Slot {slot.number}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</p>
                  </td>
                  {selectedDays.map((day) => {
                    const entry = entryLookup.get(`${day}-${slot.number}`)
                    const subject = entry?.subject_id ? subjectMap.get(entry.subject_id) : null
                    const teacher = entry?.teacher_id ? teacherMap.get(entry.teacher_id) : null
                    const classItem = entry?.class_id ? classMap.get(entry.class_id) : null

                    return (
                      <td
                        key={day}
                        className="border-b border-gray-100 p-4 relative"
                        style={{ backgroundColor: subject ? `${subject.color_label}08` : undefined }}
                      >
                        {entry && subject ? (
                          <div className="space-y-1.5 min-w-0">
                            <p className="font-extrabold text-[12px] leading-tight truncate uppercase tracking-tight" style={{ color: subject.color_label }}>
                              {subject.name}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold opacity-70">
                              {scope.variant === 'teacher' ? (
                                <><FileText size={10} className="shrink-0" /> <span className="truncate">{classItem?.name ?? ''}</span></>
                              ) : (
                                <><Users size={10} className="shrink-0" /> <span className="truncate">{teacher?.name ?? ''}</span></>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 opacity-20">
                            <div className="h-1 w-full bg-gray-200 rounded-full" />
                            <div className="h-1 w-2/3 bg-gray-200 rounded-full" />
                          </div>
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
    <div className="p-4 space-y-6 max-w-5xl mx-auto pb-24">
      <Card className="no-print space-y-8 p-8 border-none shadow-xl shadow-indigo-100/50 bg-gradient-to-br from-white to-indigo-50/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <Printer size={24} />
              </div>
              Export Center
            </h1>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest ml-1">
              {term?.name ?? 'Select a term'} | Premium PDF Generation
            </p>
          </div>
          <Button 
            onClick={() => handlePrint()} 
            className="h-14 px-10 shadow-xl shadow-indigo-200 text-base font-bold rounded-2xl"
            disabled={loading || entries.length === 0}
          >
            <Download size={20} className="mr-2" />
            Download PDF
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">View Mode</p>
            <select
              className="w-full h-12 rounded-2xl border border-gray-100 bg-white px-4 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value="class">Class Timetable</option>
              <option value="all">All Classes (Bulk)</option>
              <option value="teacher">Teacher Schedule</option>
            </select>
          </div>

          {viewMode === 'class' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Select Class</p>
              <select
                className="w-full h-12 rounded-2xl border border-gray-100 bg-white px-4 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Select Teacher</p>
              <select
                className="w-full h-12 rounded-2xl border border-gray-100 bg-white px-4 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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

          <div className="space-y-2 lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Days to Include</p>
            <div className="flex gap-1.5">
              {ALL_DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 h-12 rounded-2xl border transition-all flex items-center justify-center text-xs font-black tracking-tight ${
                    selectedDays.includes(day)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-inner" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Syncing Cloud Data</p>
        </div>
      ) : entries.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-24 text-center space-y-6 border-dashed border-2 border-gray-200 bg-gray-50/30">
          <div className="p-6 bg-amber-100 rounded-3xl text-amber-600 shadow-inner">
            <AlertTriangle size={48} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900 tracking-tight">Empty Workspace</p>
            <p className="text-sm text-gray-500 font-semibold max-w-sm mx-auto leading-relaxed">
              We couldn't find any generated schedules for this term. Launch the generator to populate your timetable first.
            </p>
          </div>
          <Button variant="secondary" onClick={() => window.history.back()} className="h-12 px-8">Return to Timetable</Button>
        </Card>
      ) : (
        <div ref={printRef} className="print:p-0 animate-in fade-in zoom-in-95 duration-500">
          <style>{`
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { background: white !important; font-family: 'Inter', sans-serif !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          {viewMode === 'class' && activeClass && (
            renderSchedule({
              title: activeClass.name,
              subtitle: `${term?.name ?? 'Academic Term'} | Student Group Schedule`,
              entriesForView: filteredEntries,
              variant: 'class',
            })
          )}

          {viewMode === 'teacher' && activeTeacher && (
            renderSchedule({
              title: activeTeacher.name,
              subtitle: `${term?.name ?? 'Academic Term'} | Faculty Assignment Schedule`,
              entriesForView: filteredEntries,
              variant: 'teacher',
            })
          )}

          {viewMode === 'all' && (
            <div className="space-y-8">
              {classes.map((cls) =>
                renderSchedule({
                  title: cls.name,
                  subtitle: `${term?.name ?? 'Academic Term'} | Bulk Export`,
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
