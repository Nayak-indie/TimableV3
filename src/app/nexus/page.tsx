'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Edit2, Filter, Network, RefreshCcw, Search, Settings, Trash2 } from 'lucide-react'
import MoreOptions from '@/components/ui/MoreOptions'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase/client'
import type { Class, DayOfWeek, PeriodSlot, Subject, Teacher, TimetableEntry, Term } from '@/types'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { getCurrentDay } from '@/lib/utils'
import { readAppMemory, updateSessionState } from '@/lib/app-memory'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function cleanLabel(value: string) {
  return value.replace(/^\[DEV_SAMPLE_TIMABLE_V3\]\s*/i, '').trim()
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function strokeForCount(count: number) {
  return clamp(1 + count * 0.65, 1, 8)
}

function bezierPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5)
  const c1 = { x: from.x + dx, y: from.y }
  const c2 = { x: to.x - dx, y: to.y }
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`
}

type PeriodFilter = 'all' | number

export default function NexusPage() {
  const memory = readAppMemory()
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState(memory.session.nexus?.termId ?? '')
  const [day, setDay] = useState<DayOfWeek>(memory.session.nexus?.day ?? getCurrentDay())
  const [period, setPeriod] = useState<PeriodFilter>(memory.session.nexus?.period ?? 'all')
  const [query, setQuery] = useState(memory.session.nexus?.query ?? '')

  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [slots, setSlots] = useState<PeriodSlot[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])

  const persist = (patch: Partial<{ termId: string; day: DayOfWeek; period: PeriodFilter; query: string }>) => {
    const next = {
      termId,
      day,
      period,
      query,
      ...patch,
    }
    updateSessionState({
      nexus: {
        termId: next.termId,
        day: next.day,
        period: next.period,
        query: next.query,
      },
    })
  }

  const load = async () => {
    const [termsRes, classesRes, teachersRes, subjectsRes, slotsRes] = await Promise.all([
      supabase.from('terms').select('*').order('start_date', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
      supabase.from('teachers').select('*').eq('status', 'active').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('period_slots').select('*').eq('slot_type', 'lesson').order('number'),
    ])

    const fetchedTerms = termsRes.data ?? []
    setTerms(fetchedTerms)
    setClasses(classesRes.data ?? [])
    setTeachers(teachersRes.data ?? [])
    setSubjects(subjectsRes.data ?? [])
    setSlots(slotsRes.data ?? [])

    const resolvedTermId = (() => {
      if (termId && fetchedTerms.some((term) => term.id === termId)) return termId
      const preferred = memory.session.nexus?.termId
      if (preferred && fetchedTerms.some((term) => term.id === preferred)) return preferred
      const active = fetchedTerms.find((term) => term.is_active)
      return active?.id ?? fetchedTerms[0]?.id ?? ''
    })()
    setTermId(resolvedTermId)
    persist({ termId: resolvedTermId })

    if (resolvedTermId) {
      const entriesRes = await supabase.from('timetable_entries').select('*').eq('term_id', resolvedTermId)
      setEntries(entriesRes.data ?? [])
    } else {
      setEntries([])
    }
  }

  useDevDataSync(load, [termId])

  const term = useMemo(() => terms.find((item) => item.id === termId) ?? null, [termId, terms])
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])
  const teacherMap = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers])
  const subjectMap = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects])

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!entry.subject_id || !entry.teacher_id) return false
      if (entry.day !== day) return false
      if (period !== 'all' && entry.period_number !== period) return false
      if (!q) return true
      const cls = classMap.get(entry.class_id)
      const subj = subjectMap.get(entry.subject_id)
      const tch = teacherMap.get(entry.teacher_id)
      const haystack = `${cls?.name ?? ''} ${subj?.name ?? ''} ${tch?.name ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [classMap, day, entries, period, query, subjectMap, teacherMap])

  const aggregates = useMemo(() => {
    const classSubject = new Map<string, number>()
    const subjectTeacher = new Map<string, number>()
    const classLoad = new Map<string, number>()
    const subjectLoad = new Map<string, number>()
    const teacherLoad = new Map<string, number>()

    for (const entry of filteredEntries) {
      if (!entry.subject_id || !entry.teacher_id) continue
      const csKey = `${entry.class_id}|${entry.subject_id}`
      const stKey = `${entry.subject_id}|${entry.teacher_id}`
      classSubject.set(csKey, (classSubject.get(csKey) ?? 0) + 1)
      subjectTeacher.set(stKey, (subjectTeacher.get(stKey) ?? 0) + 1)
      classLoad.set(entry.class_id, (classLoad.get(entry.class_id) ?? 0) + 1)
      subjectLoad.set(entry.subject_id, (subjectLoad.get(entry.subject_id) ?? 0) + 1)
      teacherLoad.set(entry.teacher_id, (teacherLoad.get(entry.teacher_id) ?? 0) + 1)
    }

    return { classSubject, subjectTeacher, classLoad, subjectLoad, teacherLoad }
  }, [filteredEntries])

  const layout = useMemo(() => {
    const rowHeight = 44
    const paddingTop = 56
    const nodeHeight = 30
    const nodeWidth = 250

    const sortedClasses = [...classes].sort((a, b) => (aggregates.classLoad.get(b.id) ?? 0) - (aggregates.classLoad.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    const sortedSubjects = [...subjects].sort((a, b) => (aggregates.subjectLoad.get(b.id) ?? 0) - (aggregates.subjectLoad.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    const sortedTeachers = [...teachers].sort((a, b) => (aggregates.teacherLoad.get(b.id) ?? 0) - (aggregates.teacherLoad.get(a.id) ?? 0) || a.name.localeCompare(b.name))

    const height = paddingTop + rowHeight * Math.max(sortedClasses.length, sortedSubjects.length, sortedTeachers.length) + 56
    const width = 980
    const x = {
      classes: 40,
      subjects: 365,
      teachers: 690,
    }

    const pos = {
      classes: new Map<string, { x: number; y: number }>(),
      subjects: new Map<string, { x: number; y: number }>(),
      teachers: new Map<string, { x: number; y: number }>(),
    }

    sortedClasses.forEach((item, index) => pos.classes.set(item.id, { x: x.classes, y: paddingTop + index * rowHeight }))
    sortedSubjects.forEach((item, index) => pos.subjects.set(item.id, { x: x.subjects, y: paddingTop + index * rowHeight }))
    sortedTeachers.forEach((item, index) => pos.teachers.set(item.id, { x: x.teachers, y: paddingTop + index * rowHeight }))

    return { width, height, nodeWidth, nodeHeight, sortedClasses, sortedSubjects, sortedTeachers, pos }
  }, [aggregates, classes, subjects, teachers])

  const edges = useMemo(() => {
    const classSubjectEdges = Array.from(aggregates.classSubject.entries()).map(([key, count]) => {
      const [classId, subjectId] = key.split('|')
      return { classId, subjectId, count }
    })
    const subjectTeacherEdges = Array.from(aggregates.subjectTeacher.entries()).map(([key, count]) => {
      const [subjectId, teacherId] = key.split('|')
      return { subjectId, teacherId, count }
    })
    return { classSubjectEdges, subjectTeacherEdges }
  }, [aggregates])

  return (
    <div className="p-4 space-y-3">
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-[var(--accent)]"><Network size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Nexus</p>
              <p className="text-xs text-[var(--text-secondary)]">Class → subject → teacher connections for a day.</p>
            </div>
          </div>
          <Button variant="ghost" onClick={load}><RefreshCcw size={14} />Refresh</Button>
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Term
            <select
              className="mt-1 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)]"
              value={termId}
              onChange={async (e) => {
                const nextId = e.target.value
                setTermId(nextId)
                persist({ termId: nextId })
                if (nextId) {
                  const entriesRes = await supabase.from('timetable_entries').select('*').eq('term_id', nextId)
                  setEntries(entriesRes.data ?? [])
                } else {
                  setEntries([])
                }
              }}
            >
              {terms.map((value) => (
                <option key={value.id} value={value.id}>{value.name}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] p-1 overflow-x-auto">
            {DAYS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDay(value)
                  persist({ day: value })
                }}
                className={day === value ? 'px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[var(--on-accent)]' : 'px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Period
              <select
                className="mt-1 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)]"
                value={String(period)}
                onChange={(e) => {
                  const value = e.target.value
                  const next = value === 'all' ? 'all' : Number(value)
                  setPeriod(next)
                  persist({ period: next })
                }}
              >
                <option value="all">All day</option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.number}>P{slot.number}</option>
                ))}
              </select>
            </label>

            <div className="pt-5">
              <Input
                label=""
                placeholder="Search class/teacher/subject"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  persist({ query: e.target.value })
                }}
                icon={<Search size={16} />}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Filter size={14} />
              <span>{term ? cleanLabel(term.name) : 'No term selected'}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--accent)]">{filteredEntries.length} links</p>
          </div>
        </div>
      </Card>

      <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-primary)] shadow-[var(--shadow-primary)] overflow-hidden">
        <div className="overflow-auto">
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="block"
          >
            <defs>
              <linearGradient id="edgeFade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="40%" stopColor="var(--accent)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.22" />
              </linearGradient>
              <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width={layout.width} height={layout.height} fill="var(--surface-primary)" />
            {edges.classSubjectEdges.map((edge) => {
              const from = layout.pos.classes.get(edge.classId)
              const to = layout.pos.subjects.get(edge.subjectId)
              const subject = subjectMap.get(edge.subjectId)
              if (!from || !to) return null
              return (
                <path
                  key={`cs-${edge.classId}-${edge.subjectId}`}
                  d={bezierPath(
                    { x: from.x + layout.nodeWidth, y: from.y + layout.nodeHeight / 2 },
                    { x: to.x, y: to.y + layout.nodeHeight / 2 }
                  )}
                  fill="none"
                  stroke={subject?.color_label ?? 'url(#edgeFade)'}
                  strokeOpacity={0.38}
                  strokeWidth={strokeForCount(edge.count)}
                />
              )
            })}

            {edges.subjectTeacherEdges.map((edge) => {
              const from = layout.pos.subjects.get(edge.subjectId)
              const to = layout.pos.teachers.get(edge.teacherId)
              const subject = subjectMap.get(edge.subjectId)
              if (!from || !to) return null
              return (
                <path
                  key={`st-${edge.subjectId}-${edge.teacherId}`}
                  d={bezierPath(
                    { x: from.x + layout.nodeWidth, y: from.y + layout.nodeHeight / 2 },
                    { x: to.x, y: to.y + layout.nodeHeight / 2 }
                  )}
                  fill="none"
                  stroke={subject?.color_label ?? 'url(#edgeFade)'}
                  strokeOpacity={0.3}
                  strokeWidth={strokeForCount(edge.count)}
                />
              )
            })}

            {([
              { title: 'Classes', x: 40 },
              { title: 'Subjects', x: 365 },
              { title: 'Teachers', x: 690 },
            ] as const).map((header) => (
              <g key={header.title}>
                <text x={header.x} y={34} fill="var(--text-secondary)" fontSize="12" fontWeight="700">{header.title}</text>
              </g>
            ))}

            {layout.sortedClasses.map((item) => {
              const pos = layout.pos.classes.get(item.id)
              if (!pos) return null
              const load = aggregates.classLoad.get(item.id) ?? 0
              return (
                <g key={item.id} className="group/node">
                  <rect x={pos.x} y={pos.y} width={layout.nodeWidth} height={layout.nodeHeight} rx="12" fill="var(--surface-elevated)" stroke="var(--border-color)" className="transition-colors group-hover/node:stroke-[var(--accent)]" />
                  <text x={pos.x + 12} y={pos.y + 19} fill="var(--text-primary)" fontSize="12" fontWeight="650">
                    {cleanLabel(item.name)}
                  </text>
                  <text x={pos.x + layout.nodeWidth - 38} y={pos.y + 19} fill="var(--text-secondary)" fontSize="11" fontWeight="700" textAnchor="end">
                    {load}
                  </text>
                  <foreignObject x={pos.x + layout.nodeWidth - 32} y={pos.y + 1} width="30" height="28">
                    <MoreOptions 
                      align="right"
                      options={[
                        { label: 'Edit Class', icon: <Edit2 size={14} />, onClick: () => alert('Edit class') },
                        { label: 'Rename', icon: <Settings size={14} />, onClick: () => alert('Rename class') },
                        { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => alert('Remove class') },
                      ]}
                    />
                  </foreignObject>
                </g>
              )
            })}

            {layout.sortedSubjects.map((item) => {
              const pos = layout.pos.subjects.get(item.id)
              if (!pos) return null
              const load = aggregates.subjectLoad.get(item.id) ?? 0
              return (
                <g key={item.id} className="group/node">
                  <rect x={pos.x} y={pos.y} width={layout.nodeWidth} height={layout.nodeHeight} rx="12" fill="var(--surface-elevated)" stroke="var(--border-color)" className="transition-colors group-hover/node:stroke-[var(--accent)]" />
                  <rect x={pos.x + 10} y={pos.y + 10} width="10" height="10" rx="3" fill={item.color_label} filter="url(#softGlow)" />
                  <text x={pos.x + 28} y={pos.y + 19} fill="var(--text-primary)" fontSize="12" fontWeight="650">
                    {cleanLabel(item.name)}
                  </text>
                  <text x={pos.x + layout.nodeWidth - 38} y={pos.y + 19} fill="var(--text-secondary)" fontSize="11" fontWeight="700" textAnchor="end">
                    {load}
                  </text>
                  <foreignObject x={pos.x + layout.nodeWidth - 32} y={pos.y + 1} width="30" height="28">
                    <MoreOptions 
                      align="right"
                      options={[
                        { label: 'Edit Subject', icon: <Edit2 size={14} />, onClick: () => alert('Edit subject') },
                        { label: 'Configure', icon: <Settings size={14} />, onClick: () => alert('Configure subject') },
                        { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => alert('Remove subject') },
                      ]}
                    />
                  </foreignObject>
                </g>
              )
            })}

            {layout.sortedTeachers.map((item) => {
              const pos = layout.pos.teachers.get(item.id)
              if (!pos) return null
              const load = aggregates.teacherLoad.get(item.id) ?? 0
              return (
                <g key={item.id} className="group/node">
                  <rect x={pos.x} y={pos.y} width={layout.nodeWidth} height={layout.nodeHeight} rx="12" fill="var(--surface-elevated)" stroke="var(--border-color)" className="transition-colors group-hover/node:stroke-[var(--accent)]" />
                  <text x={pos.x + 12} y={pos.y + 19} fill="var(--text-primary)" fontSize="12" fontWeight="650">
                    {cleanLabel(item.name)}
                  </text>
                  <text x={pos.x + layout.nodeWidth - 38} y={pos.y + 19} fill="var(--text-secondary)" fontSize="11" fontWeight="700" textAnchor="end">
                    {load}
                  </text>
                  <foreignObject x={pos.x + layout.nodeWidth - 32} y={pos.y + 1} width="30" height="28">
                    <MoreOptions 
                      align="right"
                      options={[
                        { label: 'Edit Teacher', icon: <Edit2 size={14} />, onClick: () => alert('Edit teacher') },
                        { label: 'Availability', icon: <CalendarDays size={14} />, onClick: () => alert('Set availability') },
                        { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => alert('Remove teacher') },
                      ]}
                    />
                  </foreignObject>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}

