export const dynamic = 'force-dynamic'

import Card from '@/components/ui/Card'
import LiveSchoolOverview from '@/components/dashboard/LiveSchoolOverview'
import SetupStatusLinks from '@/components/dashboard/SetupStatusLinks'
import SetupHelperButton from '@/components/setup/SetupHelperButton'

export default function SetupPage() {
  return (
    <div className="p-4 space-y-3">
      <Card className="bg-indigo-50 border-indigo-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-indigo-700">Guided setup</p>
            <p className="text-xs text-indigo-600 mt-1">Start with Classes, then Teachers, then Period Slots, then Generate.</p>
          </div>
          <SetupHelperButton />
        </div>
      </Card>

      <LiveSchoolOverview compact />
      <SetupStatusLinks />
    </div>
  )
}
