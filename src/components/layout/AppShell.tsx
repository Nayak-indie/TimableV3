'use client'

import { useEffect, useState } from 'react'
import { defaultPreferences, readPreferences } from '@/lib/preferences'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const prefs = readPreferences()
    const root = document.documentElement
    root.style.setProperty('--accent', prefs.accentColor)

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const darkMode = prefs.theme === 'dark' || (prefs.theme === 'system' && prefersDark)
    root.classList.toggle('dark', darkMode)

    root.classList.toggle('no-motion', !prefs.animations)
    root.classList.toggle('layout-compact', prefs.dashboardLayout === 'compact')
    root.classList.toggle('layout-spacious', prefs.dashboardLayout !== 'compact')
    setTimeout(() => setReady(true), 0)
  }, [])

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
