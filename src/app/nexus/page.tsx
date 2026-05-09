'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Edit2, Filter, Network, RefreshCcw, Search, Settings, Trash2, AlertTriangle } from 'lucide-react'
import MoreOptions from '@/components/ui/MoreOptions'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase/client'
import type { Class, DayOfWeek, PeriodSlot, Subject, Teacher, TimetableEntry, Term } from '@/types'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { getCurrentDay } from '@/lib/utils'
import { readAppMemory, updateSessionState } from '@/lib/app-memory'
import { PrerequisiteEngine } from '@/lib/scheduling/prerequisites'
import { PredictiveAnalyzer } from '@/lib/intelligence/predictive-analysis'
import { HistoryEngine } from '@/lib/intelligence/history/execution-history'
import { PredictionDrift } from '@/lib/intelligence/calibration/prediction-drift'
import { ForecastCalibration } from '@/lib/intelligence/calibration/forecast-calibration'
import { ContextEngine } from '@/lib/intelligence/core/context-engine'
import { InstitutionalReporter } from '@/lib/reporting/governance-summary'






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

interface ConflictInfo {
  id: string
  type: 'overload' | 'clash' | 'unmet'
  severity: 'low' | 'medium' | 'high'
  message: string
}


export default function NexusPage() {
  const memory = readAppMemory()
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState(memory.session.nexus?.termId ?? '')
  const [day, setDay] = useState<DayOfWeek>(memory.session.nexus?.day ?? getCurrentDay())
  const [period, setPeriod] = useState<PeriodFilter>(memory.session.nexus?.period ?? 'all')
  const [query, setQuery] = useState(memory.session.nexus?.query ?? '')

  // Curriculum Intelligence: Demo Prerequisites
  const prereqEngine = useMemo(() => new PrerequisiteEngine({
    'physics_id': ['math_id'], // Physics depends on Math
    'organic_chem_id': ['chem_bonding_id'],
  }), [])


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

  const handleAction = async (table: string, id: string, action: 'rename' | 'remove', currentName: string) => {
    if (action === 'rename') {
      const next = prompt(`Rename ${table}:`, currentName)
      if (!next || next === currentName) return
      const { error } = await supabase.from(table).update({ name: next }).eq('id', id)
      if (error) alert('Failed to rename: ' + error.message)
      else load()
    } else if (action === 'remove') {
      if (!confirm(`Are you sure you want to remove this ${table}? This will also delete any timetable entries linked to it.`)) return
      // Handle cleanup for linked entries if necessary
      if (table === 'classes') await supabase.from('timetable_entries').delete().eq('class_id', id)
      if (table === 'teachers') await supabase.from('timetable_entries').delete().eq('teacher_id', id)
      if (table === 'subjects') await supabase.from('timetable_entries').delete().eq('subject_id', id)
      
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) alert('Failed to remove: ' + error.message)
      else load()
    }
  }

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
    const conflicts: ConflictInfo[] = []

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

    // Dependency Intelligence: Detect Semantic (Prerequisite) Violations
    const semanticViolations: Array<{ classId: string; subjectId: string; prereqId: string }> = []
    for (const entry of filteredEntries) {
      if (!entry.subject_id) continue
      
      // We check all entries in the term to see if prerequisites are met
      const { isValid, violatedSubject } = prereqEngine.validateSequence(
        entry.subject_id,
        entry.day as DayOfWeek,
        entry.period_number,
        entries.map(e => ({ subjectId: e.subject_id!, day: e.day as DayOfWeek, period: e.period_number })),
        DAYS
      )

      if (!isValid && violatedSubject) {
        semanticViolations.push({
          classId: entry.class_id,
          subjectId: entry.subject_id,
          prereqId: violatedSubject
        })
      }
    }

    // Dependency Intelligence: Detect Overloads
    teachers.forEach(t => {
      const load = teacherLoad.get(t.id) ?? 0
      if (load > t.max_periods_per_day) {
        conflicts.push({
          id: t.id,
          type: 'overload',
          severity: 'high',
          message: `${t.name} is assigned ${load} periods (Max: ${t.max_periods_per_day})`
        })
      }
    })

    return { classSubject, subjectTeacher, classLoad, subjectLoad, teacherLoad, conflicts, semanticViolations }
  }, [filteredEntries, teachers, entries, prereqEngine])

  // --- CONSOLIDATED INTELLIGENCE CORE ---
  const intelContext = useMemo(() => {
    const classSubjectLinks: Record<string, string[]> = {}
    entries.forEach(e => {
      if (!e.class_id || !e.subject_id) return
      if (!classSubjectLinks[e.class_id]) classSubjectLinks[e.class_id] = []
      if (!classSubjectLinks[e.class_id].includes(e.subject_id)) {
        classSubjectLinks[e.class_id].push(e.subject_id)
      }
    })

    const analyzer = new PredictiveAnalyzer(teachers, classes, subjects, classSubjectLinks, prereqEngine)
    const analysis = analyzer.analyze()
    
    // Fetch memory/observatory signals
    const mockHistory = [{ timestamp: '2026-05-01', success: false, bottlenecks: ['math_teacher_01', 'physics_id'], mode: 'PRECISION' }] as any
    const drift = PredictionDrift.calculateDrift(mockHistory)
    const calib = ForecastCalibration.calibrate(analysis.forecast.probability, drift)
    
    const decision = DelegationPolicy.decide(analysis.forecast, analysis.resourcePressure, analysis.dependencyRisk)

    return ContextEngine.synthesize(
      analysis.forecast,
      analysis.resourcePressure,
      analysis.dependencyRisk,
      { calibratedProbability: calib.calibratedProbability, confidence: calib.confidence, drift },
      { mode: decision.mode, reasoning: decision.reasoning, strategy: decision.strategy }
    )
  }, [teachers, classes, subjects, entries, prereqEngine])

  const report = useMemo(() => InstitutionalReporter.generateGovernanceSummary(intelContext), [intelContext])






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
    <div className="flex h-screen overflow-hidden bg-[var(--surface-primary)]">
      {/* Main Observatory Canvas */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-[var(--accent)]"><Network size={18} /></div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Nexus Intelligence Context</p>
                <p className="text-xs text-[var(--text-secondary)]">Unified observatory for {cleanLabel(term?.name || 'current term')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-color)]">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest">FEASIBILITY</span>
                <span className={`text-[10px] font-black ${intelContext.calibration.calibratedProbability > 0.7 ? 'text-green-500' : 'text-orange-500'}`}>
                  {Math.round(intelContext.calibration.calibratedProbability * 100)}%
                </span>
              </div>
              <Button variant="ghost" onClick={load}><RefreshCcw size={14} />Sync Context</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Day Selection</label>
              <div className="mt-1 flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--surface-secondary)] p-1">
                {DAYS.map((value) => (
                  <button key={value} onClick={() => { setDay(value); persist({ day: value }) }}
                    className={day === value ? 'flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--accent)] text-[var(--on-accent)]' : 'flex-1 py-1.5 rounded-lg text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Period</label>
              <select className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-secondary)] px-2 py-1.5 text-xs"
                value={String(period)} onChange={(e) => { const v = e.target.value === 'all' ? 'all' : Number(e.target.value); setPeriod(v); persist({ period: v }) }}>
                <option value="all">All Day</option>
                {slots.map((s) => <option key={s.id} value={s.number}>P{s.number}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Global Trace</label>
              <div className="mt-1 px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] italic truncate">
                {intelContext.routing.mode}: {intelContext.routing.reasoning}
              </div>
            </div>
          </div>
        </Card>

        <div className="rounded-[32px] border border-[var(--border-color)] bg-[var(--surface-primary)] shadow-2xl overflow-hidden relative">
          <div className="overflow-auto">
            <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="block">
              <defs>
                <linearGradient id="edgeFade" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              
              {/* Contextual Edges */}
              {edges.classSubjectEdges.map((edge) => {
                const from = layout.pos.classes.get(edge.classId);
                const to = layout.pos.subjects.get(edge.subjectId);
                if (!from || !to) return null;
                return (
                  <path key={`cs-${edge.classId}`} d={bezierPath({ x: from.x + layout.nodeWidth, y: from.y + layout.nodeHeight/2 }, { x: to.x, y: to.y + layout.nodeHeight/2 })}
                    fill="none" stroke="url(#edgeFade)" strokeWidth={strokeForCount(edge.count)} strokeOpacity={0.3} />
                )
              })}

              {/* Intelligence Nodes */}
              {layout.sortedTeachers.map((t) => {
                const pos = layout.pos.teachers.get(t.id);
                if (!pos) return null;
                const pressure = intelContext.pressure.find(p => p.id === t.id);
                const isCritical = pressure && pressure.score > 0.85;

                return (
                  <g key={t.id} className="group/node">
                    {isCritical && <rect x={pos.x - 4} y={pos.y - 4} width={layout.nodeWidth + 8} height={layout.nodeHeight + 8} rx="16" fill="rgba(239, 68, 68, 0.1)" className="animate-pulse" />}
                    <rect x={pos.x} y={pos.y} width={layout.nodeWidth} height={layout.nodeHeight} rx="12" fill="var(--surface-elevated)" stroke={isCritical ? '#ef4444' : 'var(--border-color)'} strokeWidth={isCritical ? 2 : 1} />
                    <text x={pos.x + 12} y={pos.y + 19} fill={isCritical ? '#ef4444' : 'var(--text-primary)'} fontSize="11" fontWeight="700">{cleanLabel(t.name)}</text>
                  </g>
                )
              })}
              
              {/* Header Labels */}
              <text x={40} y={30} fill="var(--text-secondary)" fontSize="10" fontWeight="900" className="uppercase tracking-[0.2em]">Classes</text>
              <text x={365} y={30} fill="var(--text-secondary)" fontSize="10" fontWeight="900" className="uppercase tracking-[0.2em]">Curriculum</text>
              <text x={690} y={30} fill="var(--text-secondary)" fontSize="10" fontWeight="900" className="uppercase tracking-[0.2em]">Resources</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Governance & Strategic Reporting Sidebar */}
      <div className="w-80 border-l border-[var(--border-color)] bg-[var(--surface-secondary)] p-5 overflow-auto space-y-6">
        <div>
          <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Institutional Risk</h3>
          <div className="relative h-2 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-red-500 transition-all duration-1000" style={{ width: `${report.institutionalRiskScore * 100}%` }} />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{Math.round(report.institutionalRiskScore * 100)}%</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Longitudinal stability metric</p>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3">Chronic Bottlenecks</h3>
          <div className="space-y-2">
            {report.topBottlenecks.map((b, i) => (
              <div key={i} className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-[10px] font-bold text-red-600">
                {b}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3">Strategic Insights</h3>
          <div className="space-y-3">
            {report.strategicInsights.map((insight, i) => (
              <div key={i} className="flex gap-2">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] font-medium">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-color)]">
          <div className="p-4 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest">Self-Correction</p>
            <p className="text-xs font-medium leading-snug">The observatory has calibrated the current forecast with {Math.round(intelContext.calibration.confidence * 100)}% confidence.</p>
          </div>
        </div>
      </div>
    </div>
  )
}


