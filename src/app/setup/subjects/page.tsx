'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Class, Subject, Teacher } from '@/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { parseTeacherMeta } from '@/lib/teacher-meta'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { fetchClassSubjectMap } from '@/lib/setup-links'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [classSubjectMap, setClassSubjectMap] = useState<Record<string, string[]>>({})

  const loadSubjects = async () => {
    const [subjectsRes, teachersRes, classesRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('classes').select('*').order('name'),
    ])
    const classSubjectMapRes = await fetchClassSubjectMap(supabase)
    setSubjects(subjectsRes.data ?? [])
    setTeachers(teachersRes.data ?? [])
    setClasses(classesRes.data ?? [])
    setClassSubjectMap(classSubjectMapRes)
  }

  useDevDataSync(loadSubjects)

  return (
    <div className="p-4 space-y-3">
      <Card className="bg-indigo-50 border-indigo-200">
        <p className="text-sm font-semibold text-indigo-700">Subject metadata overview</p>
        <p className="text-xs text-indigo-600 mt-1">Subjects are created during class setup. Edit only when needed.</p>
      </Card>
      {subjects.map((item) => (
        <Card key={item.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
            <p className="font-semibold text-gray-800">{item.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge label={`${item.periods_per_week} periods/week`} />
              <Badge label={item.category} className="capitalize" />
            </div>
            </div>
            <Link href={`/setup/subjects/${item.id}`} className="text-xs text-indigo-600 inline-flex items-center gap-1">
              <Pencil size={12} /> Edit
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            Classes:{' '}
            {classes
              .filter((cls) => (classSubjectMap[cls.id] ?? []).includes(item.id))
              .map((cls) => cls.name)
              .join(', ') || 'Not linked yet'}
          </p>
          <p className="text-xs text-gray-500">
            Teachers:{' '}
            {teachers
              .filter((teacher) => teacher.subjects?.includes(item.id))
              .map((teacher) => {
                const meta = parseTeacherMeta(teacher)
                return meta.code ? `${teacher.name} (${meta.code})` : teacher.name
              })
              .join(', ') || 'Not assigned yet'}
          </p>
        </Card>
      ))}
      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create or link subjects from a class. New subjects will fill this space as soon as they are added."
          preview={(
            <div className="grid gap-2">
              <div className="h-10 rounded-xl bg-indigo-50 border border-indigo-100" />
              <div className="h-10 rounded-xl bg-indigo-50 border border-indigo-100" />
            </div>
          )}
        />
      ) : null}
    </div>
  )
}
