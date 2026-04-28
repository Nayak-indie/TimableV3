'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Class } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name')
    setClasses(data ?? [])
  }

  const onDelete = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id)
    await loadClasses()
  }

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      setClasses(data ?? [])
    })
  }, [])

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
    </div>
  )
}
