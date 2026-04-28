'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { defaultPreferences, readPreferences } from '@/lib/preferences'
import { DEV_DATA_SYNC_EVENT } from '@/lib/dev/data-sync'
import { applyThemeToRoot } from '@/lib/theme'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const prefs = readPreferences()
    const root = document.documentElement
    applyThemeToRoot(root, prefs.theme)

    root.classList.toggle('no-motion', !prefs.animations)
    root.classList.toggle('layout-compact', prefs.dashboardLayout === 'compact')
    root.classList.toggle('layout-spacious', prefs.dashboardLayout !== 'compact')
    setTimeout(() => setReady(true), 0)
  }, [])

  useEffect(() => {
    const handleSync = () => {
      router.refresh()
    }

    window.addEventListener(DEV_DATA_SYNC_EVENT, handleSync)
    return () => window.removeEventListener(DEV_DATA_SYNC_EVENT, handleSync)
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </div>
    )
  }

  return <>{children}</>
}

export function useInitialPreferences() {
  const [prefs] = useState(() => readPreferences() ?? defaultPreferences)
  return prefs
}
