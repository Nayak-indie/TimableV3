'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function NewEventPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [eventType, setEventType] = useState('assembly')
  const [error, setError] = useState('')

  const onSave = async () => {
    if (!name.trim()) {
      setError('Event name is required.')
      return
    }
    const { error: insertError } = await supabase.from('events').insert({
      name,
      event_date: date,
      event_type: eventType,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.push('/changes')
  }

  return (
    <div className="p-4 space-y-4">
      <Input placeholder="Event name" label="Event name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
      <select
        className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-gray-800"
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
      >
        <option value="assembly">assembly</option>
        <option value="exam">exam</option>
        <option value="sports">sports</option>
        <option value="holiday">holiday</option>
      </select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button fullWidth onClick={onSave}>Save event</Button>
    </div>
  )
}
