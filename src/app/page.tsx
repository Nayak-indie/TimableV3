export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Settings } from 'lucide-react'
import PersonalizedHeader from '@/components/dashboard/PersonalizedHeader'
import LiveSchoolOverview from '@/components/dashboard/LiveSchoolOverview'
import Button from '@/components/ui/Button'

export default function DashboardPage() {
  return (
    <div className="px-4 py-6 space-y-5 bg-gradient-to-b from-indigo-50/70 to-purple-50/40 min-h-full">
      <div>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        <h1 className="text-2xl font-bold text-gray-900">Timable</h1>
        <p className="text-sm text-gray-500 mt-1">Build and adjust weekly teacher-class schedules fast.</p>
        <PersonalizedHeader />
      </div>

      <LiveSchoolOverview />

      <div className="grid grid-cols-2 gap-3">
        <Link href="/timetable/generate"><Button fullWidth className="h-14"><Plus size={16} />New Timetable</Button></Link>
        <Link href="/setup"><Button fullWidth variant="secondary" className="h-14"><Settings size={16} />Setup Data</Button></Link>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-white p-4 space-y-2 shadow-sm">
        <p className="text-sm font-semibold text-gray-800">Upcoming events</p>
        <p className="text-xs text-gray-500">Open the Events tab to manage holidays, exams, and assemblies.</p>
      </div>
    </div>
  )
}

