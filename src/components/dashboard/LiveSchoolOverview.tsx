'use client'

import { useState } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

type Summary = {
  activeTerm: string
  classes: number
  teachers: number
  subjects: number
  periodSlots: number
  timetableEntries: number
  events: number
}

const defaultSummary: Summary = {
  activeTerm: 'Not set',
  classes: 0,
  teachers: 0,
  subjects: 0,
  periodSlots: 0,
  timetableEntries: 0,
  events: 0,
}

export default function LiveSchoolOverview({ compact = false }: { compact?: boolean }) {
  const [summary, setSummary] = useState<Summary>(defaultSummary)
  const [ready, setReady] = useState(false)

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/dev/summary', { cache: 'no-store' })
      if (response.ok) {
        const payload = (await response.json()) as Summary
        setSummary(payload)
      }
    } finally {
      setReady(true)
    }
  }

  useDevDataSync(loadSummary)

  const readiness = Math.round(
    ((summary.classes > 0 ? 1 : 0) +
      (summary.teachers > 0 ? 1 : 0) +
      (summary.subjects > 0 ? 1 : 0) +
      (summary.periodSlots > 0 ? 1 : 0) +
      (summary.timetableEntries > 0 ? 1 : 0)) / 5 * 100
  )

  if (!ready) {
    return (
      <div className="space-y-3">
        <Card className="h-24 animate-pulse bg-white" />
        <Card className="h-28 animate-pulse bg-white" />
      </div>
    )
  }

  if (compact) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Live setup status</p>
          <Badge label={readiness >= 80 ? 'Ready' : 'Needs setup'} variant={readiness >= 80 ? 'success' : 'warning'} />
        </div>
        <p className="text-xs text-gray-500">Active term: {summary.activeTerm}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs text-gray-500">Classes</p>
            <p className="text-xl font-bold text-gray-900">{summary.classes}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs text-gray-500">Teachers</p>
            <p className="text-xl font-bold text-gray-900">{summary.teachers}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs text-gray-500">Subjects</p>
            <p className="text-xl font-bold text-gray-900">{summary.subjects}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs text-gray-500">Slots</p>
            <p className="text-xl font-bold text-gray-900">{summary.periodSlots}</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${readiness}%` }} />
        </div>
        <p className="text-xs font-semibold text-indigo-700">{readiness}% ready</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-1">
          <CalendarDays size={18} className="text-indigo-500" />
          <p className="text-2xl font-bold">{summary.timetableEntries}</p>
          <p className="text-xs text-gray-500">Scheduled entries</p>
        </Card>
        <Card className="space-y-1">
          <Sparkles size={18} className="text-violet-500" />
          <p className="text-2xl font-bold">{summary.events}</p>
          <p className="text-xs text-gray-500">Events this week</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Status</p>
          <Badge label={readiness >= 80 ? 'Ready' : 'Needs setup'} variant={readiness >= 80 ? 'success' : 'warning'} />
        </div>
        <p className="text-xs text-gray-500">
          Active term: {summary.activeTerm} | Classes: {summary.classes} | Teachers: {summary.teachers} | Subjects: {summary.subjects}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${readiness}%` }} />
        </div>
        <p className="text-xs font-semibold text-indigo-700">Timetable readiness: {readiness}%</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-indigo-50 p-2">
            <p className="text-gray-500">Classes</p>
            <p className="font-semibold text-gray-900">{summary.classes}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-2">
            <p className="text-gray-500">Teachers</p>
            <p className="font-semibold text-gray-900">{summary.teachers}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-2">
            <p className="text-gray-500">Subjects</p>
            <p className="font-semibold text-gray-900">{summary.subjects}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-2">
            <p className="text-gray-500">Slots</p>
            <p className="font-semibold text-gray-900">{summary.periodSlots}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
