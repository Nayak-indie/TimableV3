'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Teacher } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { readSubjectManualMeta, writeSubjectManualMeta } from '@/lib/setup-constants'
import { fetchClassSubjectMap } from '@/lib/setup-links'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'

export default function SubjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [name, setName] = useState('')
  const [periodsPerWeek, setPeriodsPerWeek] = useState(4)
  const [colorLabel, setColorLabel] = useState('#6366f1')
  const [category, setCategory] = useState<'core' | 'elective'>('core')
  const [teacherIds, setTeacherIds] = useState<string[]>([])
  const [shortName, setShortName] = useState('')
  const [notes, setNotes] = useState('')
  const [linkedClassCount, setLinkedClassCount] = useState(0)

  const loadFormData = async () => {
    const manual = readSubjectManualMeta()
    const classMap = await fetchClassSubjectMap()
    const count = Object.values(classMap).filter((subjectIds) => subjectIds.includes(id)).length
    if (!isNew && manual[id]) {
      setShortName(manual[id].shortName ?? '')
      setNotes(manual[id].notes ?? '')
    }
    setLinkedClassCount(count)

    const [teachersRes, subjectRes] = await Promise.all([
      fetch('/api/data/teachers', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      isNew ? Promise.resolve({ ok: true, data: null }) : fetch(`/api/data/subjects/${id}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ])
    setTeachers(teachersRes?.ok ? ((teachersRes.data ?? []) as Teacher[]).filter((t) => t.status === 'active') : [])
    if (isNew) return
    const data = subjectRes?.ok ? subjectRes.data : null
    if (!data) return
    setName(data.name ?? '')
    setPeriodsPerWeek(data.periods_per_week ?? 4)
    setColorLabel(data.color_label ?? '#6366f1')
    setCategory(data.category ?? 'core')
    setTeacherIds(data.teacher_ids ?? [])
  }

  useDevDataSync(loadFormData, [id, isNew])

  const toggleTeacher = (teacherId: string) => {
    setTeacherIds((prev) =>
      prev.includes(teacherId) ? prev.filter((value) => value !== teacherId) : [...prev, teacherId]
    )
  }

  const onSave = async () => {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      periods_per_week: periodsPerWeek,
      color_label: colorLabel,
      category,
      teacher_ids: teacherIds,
    }
    let subjectId = id
    if (isNew) {
      const response = await fetch('/api/data/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const created = await response.json().catch(() => null)
      subjectId = created?.ok ? (created.data?.id ?? id) : id
    } else {
      await fetch(`/api/data/subjects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }

    const manual = readSubjectManualMeta()
    manual[subjectId] = { shortName: shortName.trim(), notes: notes.trim() }
    writeSubjectManualMeta(manual)
    emitDevDataSync()
    router.push('/setup/subjects')
  }

  return (
    <div className="p-4 space-y-3">
      <Input label="Subject name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" />
      <Input label="Periods per week" type="number" min={1} max={20} value={periodsPerWeek} onChange={(e) => setPeriodsPerWeek(Number(e.target.value))} />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Color
        <input type="color" value={colorLabel} onChange={(e) => setColorLabel(e.target.value)} />
      </label>
      <select
        className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-gray-800"
        value={category}
        onChange={(e) => setCategory(e.target.value as 'core' | 'elective')}
      >
        <option value="core">Core</option>
        <option value="elective">Elective</option>
      </select>
      <Input label="Short name (manual data)" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Math" />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-600">Notes (manual data)</span>
        <textarea
          className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-gray-800 min-h-20"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional subject notes..."
        />
      </label>
      {!isNew ? (
        <p className="text-xs text-indigo-600">
          This subject is currently linked in class constants: {linkedClassCount} class(es).
        </p>
      ) : null}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-600">Teachers</p>
        {teachers.map((teacher) => (
          <label key={teacher.id} className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={teacherIds.includes(teacher.id)}
              onChange={() => toggleTeacher(teacher.id)}
            />
            <span>{teacher.name}</span>
          </label>
        ))}
      </div>
      <Button fullWidth onClick={onSave}>Save Subject</Button>
    </div>
  )
}
