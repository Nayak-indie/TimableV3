'use client'

import { useInitialPreferences } from '@/components/layout/AppShell'

export default function PersonalizedHeader() {
  const prefs = useInitialPreferences()
  return (
    <p className="text-sm text-gray-500 mt-1">
      {prefs.schoolName} · {prefs.academicYear}
    </p>
  )
}
