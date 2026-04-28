import Link from 'next/link'
import Card from '@/components/ui/Card'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function SetupPage() {
  const supabase = createServerSupabaseClient()
  const [teachers, classes, subjects, periods] = await Promise.all([
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('subjects').select('id', { count: 'exact', head: true }),
    supabase.from('period_slots').select('id', { count: 'exact', head: true }),
  ])

  const cards = [
    { href: '/setup/classes', title: 'Classes', count: classes.count ?? 0 },
    { href: '/setup/teachers', title: 'Teachers', count: teachers.count ?? 0 },
    { href: '/setup/periods', title: 'Period Slots', count: periods.count ?? 0 },
    ...(subjects.count && subjects.count > 0
      ? [{ href: '/setup/subjects', title: 'Subjects', count: subjects.count }]
      : []),
  ]

  return (
    <div className="p-4 space-y-3">
      <Card className="bg-indigo-50 border-indigo-200">
        <p className="text-sm font-semibold text-indigo-700">Guided setup</p>
        <p className="text-xs text-indigo-600 mt-1">Start with Classes, then Teachers, then Period Slots, then Generate.</p>
      </Card>
      {cards.map((card) => (
        <Link key={card.href} href={card.href}>
          <Card className="flex justify-between items-center">
            <p className="font-semibold">{card.title}</p>
            <p className="text-lg font-bold text-indigo-600">{card.count}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
