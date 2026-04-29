'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Subject } from '@/types'
import { fetchClassSubjectMap } from '@/lib/setup-links'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'

export default function ClassFormPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'
  const [name, setName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [section, setSection] = useState('')
  const [periodsPerDay, setPeriodsPerDay] = useState(6)
  const [roomId, setRoomId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [newSubjectName, setNewSubjectName] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')

  const loadFormData = async () => {
    const [subjectsRes, classRes] = await Promise.all([
      fetch('/api/data/subjects', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      isNew ? Promise.resolve({ ok: true, data: null }) : fetch(`/api/data/classes/${id}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ])
    setSubjects(subjectsRes?.ok ? subjectsRes.data ?? [] : [])
    if (isNew) return
    const data = classRes?.ok ? classRes.data : null
    if (!data) return
    setName(data.name ?? '')
    setGradeLevel(data.grade_level ?? '')
    setSection(data.section ?? '')
    setPeriodsPerDay(data.periods_per_day ?? 6)
    setRoomId(data.room_id ?? '')
    const map = await fetchClassSubjectMap()
    setSelectedSubjectIds(map[id] ?? [])
  }

  useDevDataSync(loadFormData, [id, isNew])

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((value) => value !== subjectId)
        : [...prev, subjectId]
    )
  }

  const createOrReuseSubject = async () => {
    const rawName = newSubjectName.trim().replace(/\s+/g, ' ')
    if (!rawName) return
    const normalized = rawName.toLowerCase()
    const existing = subjects.find((subject: Subject) => subject.name.trim().toLowerCase() === normalized)
    if (existing) {
      if (!selectedSubjectIds.includes(existing.id)) {
        setSelectedSubjectIds((prev) => [...prev, existing.id])
      }
      setNewSubjectName('')
      return
    }

    const titleCase = rawName
      .split(' ')
      .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    const response = await fetch('/api/data/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: titleCase,
        periods_per_week: 4,
        category: 'core',
      }),
    })
    const created = await response.json().catch(() => null)
    const inserted = created?.ok ? created.data : null
    if (!inserted) return
    const insertedSubject = inserted as Subject
    setSubjects((prev) => [...prev, insertedSubject].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedSubjectIds((prev) => [...prev, insertedSubject.id])
    setNewSubjectName('')
    emitDevDataSync()
  }

  const onSave = async () => {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      grade_level: gradeLevel.trim() || null,
      section: section.trim() || null,
      periods_per_day: periodsPerDay,
      room_id: roomId.trim() || null,
    }
    let classId = id
    if (isNew) {
      const response = await fetch('/api/data/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const created = await response.json().catch(() => null)
      classId = created?.ok ? (created.data?.id ?? id) : id
    } else {
      await fetch(`/api/data/classes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    await fetch('/api/data/class-subject-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId, subjectIds: selectedSubjectIds }) })
    emitDevDataSync()
    router.push('/setup/classes')
  }

  const visibleSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  )

  return (
    <div className="p-4 space-y-3">
      <Input label="Class name" value={name} onChange={(e) => setName(e.target.value)} placeholder="10A" />
      <Input label="Grade level" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="10" />
      <Input label="Section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" />
      <Input label="Periods per day" type="number" min={1} max={10} value={periodsPerDay} onChange={(e) => setPeriodsPerDay(Number(e.target.value))} />
      <Input label="Room" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="R-202" />
      <div className="space-y-2 rounded-2xl border border-indigo-100 bg-white p-3">
        <p className="text-xs font-semibold text-gray-600">Subjects for this class</p>
        <Input
          placeholder="Search existing subjects"
          value={subjectSearch}
          onChange={(e) => setSubjectSearch(e.target.value)}
        />
        {visibleSubjects.map((subject) => (
          <label key={subject.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedSubjectIds.includes(subject.id)}
              onChange={() => toggleSubject(subject.id)}
            />
            <span>{subject.name}</span>
          </label>
        ))}
        <div className="pt-2 border-t border-indigo-100">
          <Input
            placeholder="Add new subject (e.g. English)"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
          />
          <Button variant="ghost" className="mt-2" onClick={createOrReuseSubject}>
            <Plus size={14} />
            Add/Re-use subject
          </Button>
        </div>
      </div>
      <Button fullWidth onClick={onSave}>Save Class</Button>
    </div>
  )
}
