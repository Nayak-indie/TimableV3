'use client'

import Link from 'next/link'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

type Summary = {
  classes: number
  teachers: number
  subjects: number
  periodSlots: number
}

const defaultSummary: Summary = {
  classes: 0,
  teachers: 0,
  subjects: 0,
  periodSlots: 0,
}

function parseSummary(value: unknown): Summary | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (v.ok !== true) return null
  if (typeof v.classes !== 'number' || typeof v.teachers !== 'number' || typeof v.subjects !== 'number' || typeof v.periodSlots !== 'number') return null
  return {
    classes: v.classes,
    teachers: v.teachers,
    subjects: v.subjects,
    periodSlots: v.periodSlots,
  }
}

export default function SetupStatusLinks() {
  const [summary, setSummary] = useState<Summary>(defaultSummary)
  const [ready, setReady] = useState(false)

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/data/summary', { cache: 'no-store' })
      if (response.ok) {
        const payload = await response.json().catch(() => null)
        const parsed = parseSummary(payload)
        if (parsed) setSummary(parsed)
      }
    } finally {
      setReady(true)
    }
  }

  useDevDataSync(loadSummary)

  const cards = [
    { href: '/setup/classes', title: 'Classes', count: summary.classes },
    { href: '/setup/teachers', title: 'Teachers', count: summary.teachers },
    { href: '/setup/periods', title: 'Period Slots', count: summary.periodSlots },
    { href: '/setup/subjects', title: 'Subjects', count: summary.subjects },
  ]

  return (
    <div className="space-y-2">
      {!ready ? (
        <>
          <Card className="h-16 animate-pulse rounded-[24px]" />
          <Card className="h-16 animate-pulse rounded-[24px]" />
          <Card className="h-16 animate-pulse rounded-[24px]" />
          <Card className="h-16 animate-pulse rounded-[24px]" />
        </>
      ) : null}
      {cards.map((card) => (
        <Link key={card.href} href={card.href}>
          <Card className="flex items-center justify-between rounded-[24px] px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-base font-semibold text-[var(--text-primary)]">{card.title}</p>
            <p className="text-2xl font-bold text-[var(--accent)]">{card.count}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
