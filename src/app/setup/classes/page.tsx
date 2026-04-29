'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Class } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'
import EmptyState from '@/components/ui/EmptyState'

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])

  const loadClasses = async () => {
    const response = await fetch('/api/data/classes', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!payload?.ok) return
    setClasses(payload.data ?? [])
  }

  const onDelete = async (id: string) => {
    await fetch(`/api/data/classes/${id}`, { method: 'DELETE' })
    await loadClasses()
    emitDevDataSync()
  }

  useDevDataSync(loadClasses)

  return (
    <div className="p-4 space-y-3">
      <Link href="/setup/classes/new"><Button fullWidth><Plus size={16} />Add Class</Button></Link>
      {classes.map((item) => (
        <Card key={item.id} className="flex items-center justify-between">
          <Link href={`/setup/classes/${item.id}`} className="flex-1">
            <p className="font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-500">{item.grade_level ?? '-'} | {item.section ?? '-'}</p>
          </Link>
          <Button variant="ghost" onClick={() => onDelete(item.id)}><Trash2 size={16} /></Button>
        </Card>
      ))}
      {classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Add a class to start building the timetable. New classes will populate this list immediately."
          preview={(
            <div className="grid gap-2">
              <div className="h-12 rounded-xl bg-indigo-50 border border-indigo-100" />
              <div className="h-12 rounded-xl bg-indigo-50 border border-indigo-100" />
            </div>
          )}
        />
      ) : null}
    </div>
  )
}
