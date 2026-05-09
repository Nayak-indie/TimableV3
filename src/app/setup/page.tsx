export const dynamic = 'force-dynamic'

import Card from '@/components/ui/Card'
import { Sparkles } from 'lucide-react'
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
      
      <Card className="border-dashed border-2 flex flex-col items-center justify-center py-8 text-center space-y-3">
        <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
          <Sparkles size={24} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Database is empty</p>
          <p className="text-xs text-gray-500 max-w-[200px] mx-auto mt-1">Populate your project with a full set of sample teachers, classes, and subjects.</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={async () => {
            if (!confirm('This will reset your database and add sample data. Continue?')) return;
            const res = await fetch('/api/dev/sample-data', { method: 'POST' });
            if (res.ok) {
              alert('Sample data generated successfully! Refreshing...');
              window.location.reload();
            } else {
              const err = await res.json();
              alert('Failed: ' + (err.error || 'Unknown error'));
            }
          }}
        >
          Seed Sample Data
        </Button>
      </Card>

      <SetupStatusLinks />
    </div>
  )
}
