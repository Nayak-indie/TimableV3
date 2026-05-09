export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Settings } from 'lucide-react'
import PersonalizedHeader from '@/components/dashboard/PersonalizedHeader'
import LiveSchoolOverview from '@/components/dashboard/LiveSchoolOverview'
import TimetableList from '@/components/dashboard/TimetableList'
import Button from '@/components/ui/Button'

export default function DashboardPage() {
  return (
    <div className="px-4 py-6 space-y-7 bg-gradient-to-b from-indigo-50/70 to-purple-50/40 min-h-full pb-24">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 ml-0.5">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">School Center</h1>
        <PersonalizedHeader />
      </div>

      <LiveSchoolOverview />

      <div className="grid grid-cols-2 gap-3">
        <Link href="/timetable/generate"><Button fullWidth className="h-16 rounded-2xl shadow-lg shadow-indigo-100"><Plus size={18} className="mr-1" />New Schedule</Button></Link>
        <Link href="/setup"><Button fullWidth variant="secondary" className="h-16 rounded-2xl border-none bg-white shadow-lg shadow-gray-100"><Settings size={18} className="mr-1 text-indigo-600" />System Setup</Button></Link>
      </div>

      <TimetableList />

      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 ml-1">Announcements</h2>
        <Card className="border-none shadow-lg shadow-indigo-100/20 bg-white p-5 space-y-3 rounded-[28px]">
          <div className="p-2 bg-indigo-50 rounded-xl w-fit text-indigo-600">
            <Settings size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Operational readiness</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Open the Events tab to manage holidays, exams, and assemblies. Ensure all teachers have their availability updated in Setup.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

