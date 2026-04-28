'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import type { Class, Subject, Teacher } from '@/types'
import { parseTeacherMeta } from '@/lib/teacher-meta'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [successId, setSuccessId] = useState('')

  const loadTeachers = async () => {
    const [teachersRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from('teachers').select('*').order('name'),
      supabase.from('subjects').select('*'),
      supabase.from('classes').select('*'),
    ])
    setTeachers(teachersRes.data ?? [])
    setSubjects(subjectsRes.data ?? [])
    setClasses(classesRes.data ?? [])
    setIsLoading(false)
  }

  const onDelete = async (id: string) => {
    await supabase.from('teachers').delete().eq('id', id)
    await loadTeachers()
    setSuccessId(id)
    setTimeout(() => setSuccessId(''), 900)
  }

  useEffect(() => {
    Promise.all([
      supabase.from('teachers').select('*').order('name'),
      supabase.from('subjects').select('*'),
      supabase.from('classes').select('*'),
    ]).then(([teachersRes, subjectsRes, classesRes]) => {
      setTeachers(teachersRes.data ?? [])
      setSubjects(subjectsRes.data ?? [])
      setClasses(classesRes.data ?? [])
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    const highlight = window.sessionStorage.getItem('teacher_saved')
    if (highlight) {
      setTimeout(() => setSuccessId(highlight), 0)
      window.sessionStorage.removeItem('teacher_saved')
      const timer = setTimeout(() => setSuccessId(''), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="p-4 space-y-3">
      <Card className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-100">Teachers</p>
            <p className="text-2xl font-bold">{teachers.length}</p>
            <p className="text-xs text-indigo-100">Interactive cards with subjects and classes</p>
          </div>
          <Users className="text-indigo-100" />
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : null}

      <AnimatePresence>
        {teachers.map((teacher, idx) => {
          const meta = parseTeacherMeta(teacher)
          const assignedClassNames = meta.classIds
            .map((classId) => classes.find((item) => item.id === classId)?.name)
            .filter(Boolean)
          const initials = teacher.name
            .split(' ')
            .map((token) => token[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()

          return (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: successId === teacher.id ? 1.01 : 1,
              }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className="flex items-start justify-between gap-3">
                <Link href={`/setup/teachers/${teacher.id}`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold grid place-items-center">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{teacher.name}</p>
                      <p className="text-xs text-gray-500">Code: {meta.code || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {teacher.subjects?.slice(0, 3).map((subjectId) => {
                      const subject = subjects.find((item) => item.id === subjectId)
                      return <Badge key={subjectId} label={subject?.name ?? 'Unknown'} />
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Classes: {assignedClassNames.length > 0 ? assignedClassNames.join(', ') : 'Not assigned'}
                  </p>
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <Badge label={teacher.status} variant={teacher.status === 'active' ? 'success' : 'warning'} />
                  <div className="flex items-center gap-1">
                    <Link href={`/setup/teachers/${teacher.id}`}>
                      <Button variant="ghost"><Pencil size={14} /></Button>
                    </Link>
                    <Button variant="ghost" onClick={() => onDelete(teacher.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {!isLoading && teachers.length === 0 ? (
        <Card className="text-center py-8">
          <Sparkles className="mx-auto text-indigo-500 mb-2" size={20} />
          <p className="text-sm font-semibold text-gray-700">No teachers yet</p>
          <p className="text-xs text-gray-500">Click below to add your first teacher.</p>
        </Card>
      ) : null}

      <Link href="/setup/teachers/new"><Button fullWidth><Plus size={16} />Add Teacher</Button></Link>
    </div>
  )
}
