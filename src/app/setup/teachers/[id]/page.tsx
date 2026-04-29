'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Plus, Search } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import type { Class, DayOfWeek, Subject, TeacherStatus } from '@/types'
import { parseTeacherMeta, stringifyTeacherMeta } from '@/lib/teacher-meta'
import { fetchClassSubjectMap } from '@/lib/setup-links'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'

type TeacherSection = 'basic' | 'availability' | 'status'
const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function TeacherFormPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const isNew = params.id === 'new'
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [showClassPicker, setShowClassPicker] = useState(false)
  const [teacherCode, setTeacherCode] = useState('')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [maxPeriods, setMaxPeriods] = useState(6)
  const [status, setStatus] = useState<TeacherStatus>('active')
  const [availability, setAvailability] = useState<Record<DayOfWeek, number[]>>({
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
  })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [classSubjectMap, setClassSubjectMap] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<TeacherSection>('basic')

  const loadFormData = async () => {
    const [subjectsRes, classesRes, teacherRes, classSubjectMapRes] = await Promise.all([
      fetch('/api/data/subjects', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/data/classes', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      isNew ? Promise.resolve({ ok: true, data: null }) : fetch(`/api/data/teachers/${params.id}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetchClassSubjectMap(),
    ])
    setSubjects(subjectsRes?.ok ? subjectsRes.data ?? [] : [])
    setClasses(classesRes?.ok ? classesRes.data ?? [] : [])
    setClassSubjectMap(classSubjectMapRes)
    if (isNew) return
    const data = teacherRes?.ok ? teacherRes.data : null
    if (!data) return
    const meta = parseTeacherMeta(data)
    setName(data.name)
    setMaxPeriods(data.max_periods_per_day)
    setStatus(data.status)
    setTeacherCode(meta.code)
    setSelectedClassIds(meta.classIds)
    setAvailability(meta.availability)
    setSelectedSubjects(data.subjects ?? [])
  }

  useDevDataSync(loadFormData, [isNew, params.id])

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((value) => value !== subjectId)
        : [...prev, subjectId]
    )
  }

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const nextClassIds = prev.includes(classId)
        ? prev.filter((value) => value !== classId)
        : [...prev, classId]
      const nextAllowedSubjectIds = Array.from(
        new Set(nextClassIds.flatMap((id) => classSubjectMap[id] ?? []))
      )
      if (nextClassIds.length > 0) {
        setSelectedSubjects((current) =>
          current.filter((subjectId) => nextAllowedSubjectIds.includes(subjectId))
        )
      }
      return nextClassIds
    })
  }

  const toggleAvailability = (day: DayOfWeek, period: number) => {
    setAvailability((prev) => {
      const current = prev[day] ?? []
      const next = current.includes(period)
        ? current.filter((value) => value !== period)
        : [...current, period]
      return { ...prev, [day]: next.sort((a, b) => a - b) }
    })
  }

  const createSubject = async () => {
    const nameToCreate = subjectSearch.trim()
    if (!nameToCreate) return
    const response = await fetch('/api/data/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameToCreate,
        periods_per_week: 4,
        category: 'core',
      }),
    })
    const created = await response.json().catch(() => null)
    const data = created?.ok ? created.data : null
    if (!data) return
    setSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedSubjects((prev) => [...prev, data.id])
    setSubjectSearch('')
    emitDevDataSync()
  }

  const onSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    const payload = {
      name,
      max_periods_per_day: maxPeriods,
      status,
      contact_info: stringifyTeacherMeta({
        code: teacherCode.trim(),
        classIds: selectedClassIds,
        availability,
      }),
      subjects: selectedSubjects,
    }
    let savedId = params.id
    if (isNew) {
      const response = await fetch('/api/data/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const created = await response.json().catch(() => null)
      savedId = created?.ok ? (created.data?.id ?? 'new') : 'new'
    } else {
      await fetch(`/api/data/teachers/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    window.sessionStorage.setItem('teacher_saved', savedId)
    setSaved(true)
    emitDevDataSync()
    setTimeout(() => {
      router.push('/setup/teachers')
    }, 450)
  }

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  )
  const allowedSubjectIds = Array.from(
    new Set(selectedClassIds.flatMap((classId) => classSubjectMap[classId] ?? []))
  )
  const classFilteredSubjects =
    selectedClassIds.length === 0
      ? filteredSubjects
      : filteredSubjects.filter((subject) => allowedSubjectIds.includes(subject.id))

  const hasClasses = classes.length > 0

  const sectionTabs: TeacherSection[] = isNew
    ? ['basic']
    : ['basic', 'availability', 'status']

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        {sectionTabs.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize ${
              activeSection === section
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'basic' ? (
          <motion.div
            key="basic"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <Input label="Teacher Name" placeholder="e.g. Aman Verma" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Teacher Code" placeholder="e.g. TCH-07" value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} />

            <Card className="space-y-2">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setShowSubjectPicker((prev) => !prev)}
              >
                <p className="text-xs font-semibold text-gray-600">Subjects</p>
                <p className="text-sm text-gray-800">{selectedSubjects.length} selected</p>
              </button>
              {showSubjectPicker ? (
                <div className="space-y-2">
                  {selectedClassIds.length > 0 ? (
                    <p className="text-xs text-indigo-600">
                      Showing subject constants from selected classes.
                    </p>
                  ) : null}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Search or create subject"
                      className="w-full rounded-xl border border-indigo-100 pl-8 pr-3 py-2 text-sm"
                    />
                  </div>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {classFilteredSubjects.map((subject) => (
                      <label key={subject.id} className="flex items-center gap-2 text-sm rounded-lg px-2 py-1 hover:bg-indigo-50">
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                        />
                        <span>{subject.name}</span>
                      </label>
                    ))}
                  </div>
                  {classFilteredSubjects.length === 0 && subjectSearch.trim() ? (
                    <Button variant="ghost" onClick={createSubject}><Plus size={14} />Create &quot;{subjectSearch.trim()}&quot;</Button>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <Card className="space-y-2">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setShowClassPicker((prev) => !prev)}
                disabled={!hasClasses}
              >
                <p className="text-xs font-semibold text-gray-600">Classes to Teach</p>
                <p className="text-sm text-gray-800">
                  {!hasClasses ? 'Create classes first in Setup > Classes' : `${selectedClassIds.length} selected`}
                </p>
              </button>
              {showClassPicker && hasClasses ? (
                <div className="max-h-40 overflow-auto space-y-1">
                  {classes.map((cls) => (
                    <label key={cls.id} className="flex items-center gap-2 text-sm rounded-lg px-2 py-1 hover:bg-indigo-50">
                      <input
                        type="checkbox"
                        checked={selectedClassIds.includes(cls.id)}
                        onChange={() => toggleClass(cls.id)}
                      />
                      <span>{cls.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </Card>
          </motion.div>
        ) : null}

        {activeSection === 'availability' ? (
          <motion.div
            key="availability"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            {DAYS.map((day) => (
              <Card key={day} className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">{day}</p>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_PERIODS.map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => toggleAvailability(day, period)}
                      className={`rounded-lg border px-2 py-1 text-xs ${
                        availability[day]?.includes(period)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      P{period}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </motion.div>
        ) : null}

        {activeSection === 'status' ? (
          <motion.div
            key="status"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <Input
              label="Max periods/day"
              type="number"
              min={1}
              max={8}
              value={maxPeriods}
              onChange={(e) => setMaxPeriods(Number(e.target.value))}
            />
            <select className="w-full px-4 py-3 rounded-2xl border border-indigo-100" value={status} onChange={(e) => setStatus(e.target.value as TeacherStatus)}>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {saved ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2"
        >
          <CheckCircle2 size={16} /> Teacher saved successfully
        </motion.div>
      ) : null}

      <Button fullWidth onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Teacher'}
      </Button>
    </div>
  )
}
