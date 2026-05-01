'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { APP_MEMORY_EVENT, clearAppMemory, readAppMemory } from '@/lib/app-memory'

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function HistoryPage() {
  const [memory, setMemory] = useState(() => readAppMemory())

  useEffect(() => {
    const handle = () => setMemory(readAppMemory())
    window.addEventListener(APP_MEMORY_EVENT, handle)
    window.addEventListener('storage', handle)
    return () => {
      window.removeEventListener(APP_MEMORY_EVENT, handle)
      window.removeEventListener('storage', handle)
    }
  }, [])

  const events = useMemo(() => memory.history ?? [], [memory.history])

  const resetSession = () => {
    if (!window.confirm('Reset session memory and history? This does not delete your timetable data.')) return
    clearAppMemory()
    setMemory(readAppMemory())
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/settings" className="inline-flex">
            <Button variant="ghost"><ArrowLeft size={16} />Back</Button>
          </Link>
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">History</p>
            <p className="text-xs text-[var(--text-secondary)]">Auto-saved session timeline (local only).</p>
          </div>
        </div>
        <Button variant="secondary" onClick={resetSession}><RotateCcw size={16} />Reset</Button>
      </div>

      {events.length === 0 ? (
        <Card className="text-sm text-[var(--text-secondary)]">No history yet.</Card>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Card key={event.id} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                  {event.details ? <p className="text-xs text-[var(--text-secondary)]">{event.details}</p> : null}
                </div>
                <p className="text-[10px] font-semibold text-[var(--text-secondary)]">{formatTimestamp(event.at)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold text-[var(--accent)]">{event.type}</p>
                {event.payload ? (
                  <details className="text-[10px]">
                    <summary className="cursor-pointer text-[var(--text-secondary)]">Details</summary>
                    <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--border-color)] bg-[var(--surface-secondary)] p-2 text-[10px] text-[var(--text-primary)]">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

