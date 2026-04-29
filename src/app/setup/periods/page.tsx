'use client'

import { useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { PeriodSlot } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'
import { emitDevDataSync } from '@/lib/dev/data-sync'
import EmptyState from '@/components/ui/EmptyState'

interface DraftSlot {
  number: number
  start_time: string
  end_time: string
  slot_type: 'lesson' | 'break' | 'lunch'
}

export default function PeriodsPage() {
  const [slots, setSlots] = useState<PeriodSlot[]>([])
  const [draft, setDraft] = useState<DraftSlot>({
    number: 1,
    start_time: '08:00',
    end_time: '08:45',
    slot_type: 'lesson',
  })

  const loadSlots = async () => {
    const { data } = await supabase.from('period_slots').select('*').order('number')
    setSlots(data ?? [])
    setDraft((prev) => ({ ...prev, number: (data?.length ?? 0) + 1 }))
  }

  useDevDataSync(loadSlots)

  const addSlot = async () => {
    await supabase.from('period_slots').insert(draft as any)
    await loadSlots()
    emitDevDataSync()
  }

  const updateSlot = async (slot: PeriodSlot) => {
    await supabase
      .from('period_slots')
      .update({
        number: slot.number,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_type: slot.slot_type,
      })
      .eq('id', slot.id)
    await loadSlots()
    emitDevDataSync()
  }

  const deleteSlot = async (id: string) => {
    await supabase.from('period_slots').delete().eq('id', id)
    await loadSlots()
    emitDevDataSync()
  }

  return (
    <div className="p-4 space-y-3">
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Add period slot</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" value={draft.number} onChange={(e) => setDraft((prev) => ({ ...prev, number: Number(e.target.value) }))} />
          <select className="rounded-2xl border border-indigo-100 px-3 py-2 text-sm" value={draft.slot_type} onChange={(e) => setDraft((prev) => ({ ...prev, slot_type: e.target.value as DraftSlot['slot_type'] }))}>
            <option value="lesson">lesson</option>
            <option value="break">break</option>
            <option value="lunch">lunch</option>
          </select>
          <Input type="time" value={draft.start_time} onChange={(e) => setDraft((prev) => ({ ...prev, start_time: e.target.value }))} />
          <Input type="time" value={draft.end_time} onChange={(e) => setDraft((prev) => ({ ...prev, end_time: e.target.value }))} />
        </div>
        <Button fullWidth onClick={addSlot}><Plus size={16} />Add Slot</Button>
      </Card>

      {slots.map((slot) => (
        <Card key={slot.id} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={slot.number} onChange={(e) => setSlots((prev) => prev.map((item) => item.id === slot.id ? { ...item, number: Number(e.target.value) } : item))} />
            <select className="rounded-2xl border border-indigo-100 px-3 py-2 text-sm" value={slot.slot_type} onChange={(e) => setSlots((prev) => prev.map((item) => item.id === slot.id ? { ...item, slot_type: e.target.value as PeriodSlot['slot_type'] } : item))}>
              <option value="lesson">lesson</option>
              <option value="break">break</option>
              <option value="lunch">lunch</option>
            </select>
            <Input type="time" value={slot.start_time.slice(0, 5)} onChange={(e) => setSlots((prev) => prev.map((item) => item.id === slot.id ? { ...item, start_time: e.target.value } : item))} />
            <Input type="time" value={slot.end_time.slice(0, 5)} onChange={(e) => setSlots((prev) => prev.map((item) => item.id === slot.id ? { ...item, end_time: e.target.value } : item))} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => updateSlot(slot)}><Save size={16} />Save</Button>
            <Button variant="ghost" onClick={() => deleteSlot(slot.id)}><Trash2 size={16} />Delete</Button>
          </div>
        </Card>
      ))}
      {slots.length === 0 ? (
        <EmptyState
          title="No period slots yet"
          description="Add lesson, break, or lunch slots. This list grows as soon as you save a slot."
          preview={(
            <div className="space-y-2">
              <div className="h-10 rounded-xl bg-sky-50 border border-sky-100" />
              <div className="h-10 rounded-xl bg-sky-50 border border-sky-100" />
            </div>
          )}
        />
      ) : null}
    </div>
  )
}
