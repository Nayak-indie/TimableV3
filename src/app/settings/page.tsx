'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Beaker, Download, Info, LifeBuoy, Palette, RefreshCcw, RotateCcw, SlidersHorizontal, Upload, WandSparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { CLASS_SUBJECTS_KEY, SUBJECT_META_KEY, type ClassSubjectMap } from '@/lib/setup-constants'
import { defaultPreferences, readPreferences, writePreferences } from '@/lib/preferences'

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="text-indigo-600 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState(() => readPreferences())
  const [message, setMessage] = useState('')
  const [sampleDataLog, setSampleDataLog] = useState<Record<string, unknown> | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const readLocal = (key: string) => (typeof window === 'undefined' ? null : localStorage.getItem(key))

  const apply = (next: typeof prefs) => {
    setPrefs(next)
    writePreferences(next)
    const root = document.documentElement
    root.style.setProperty('--accent', next.accentColor)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const darkMode = next.theme === 'dark' || (next.theme === 'system' && prefersDark)
    root.classList.toggle('dark', darkMode)
    root.classList.toggle('no-motion', !next.animations)
    root.classList.toggle('layout-compact', next.dashboardLayout === 'compact')
    root.classList.toggle('layout-spacious', next.dashboardLayout !== 'compact')
  }

  const backupPayload = useMemo(() => {
    return {
      preferences: prefs,
      classSubjectMap: readLocal(CLASS_SUBJECTS_KEY),
      subjectMeta: readLocal(SUBJECT_META_KEY),
      onboardingComplete: readLocal('timable_onboarding_complete'),
      onboardingDismissed: readLocal('timable_onboarding_dismissed'),
    }
  }, [prefs])

  const exportData = () => {
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timable_v3_backup.json'
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Backup exported.')
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (parsed.preferences) apply({ ...defaultPreferences, ...parsed.preferences })
        if (parsed.classSubjectMap) localStorage.setItem(CLASS_SUBJECTS_KEY, parsed.classSubjectMap)
        if (parsed.subjectMeta) localStorage.setItem(SUBJECT_META_KEY, parsed.subjectMeta)
        if (parsed.onboardingComplete) localStorage.setItem('timable_onboarding_complete', parsed.onboardingComplete)
        if (parsed.onboardingDismissed) localStorage.setItem('timable_onboarding_dismissed', parsed.onboardingDismissed)
        setMessage('Backup imported.')
      } catch {
        setMessage('Invalid backup file.')
      }
    }
    reader.readAsText(file)
  }

  const resetOnboarding = () => {
    if (!window.confirm('Reset onboarding flow?')) return
    localStorage.removeItem('timable_onboarding_complete')
    localStorage.removeItem('timable_onboarding_dismissed')
    setMessage('Onboarding reset. Reload to start again.')
  }

  const clearCache = () => {
    if (!window.confirm('Clear local cache and refresh now?')) return
    localStorage.removeItem(CLASS_SUBJECTS_KEY)
    localStorage.removeItem(SUBJECT_META_KEY)
    setMessage('Local cache cleared.')
  }

  const generateSampleData = async () => {
    if (!window.confirm('Generate temporary testing sample data? Existing dev sample data will be replaced.')) return
    setIsGenerating(true)
    try {
      const response = await fetch('/api/dev/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Failed to generate sample data')
      if (payload.classSubjectMap) {
        localStorage.setItem(CLASS_SUBJECTS_KEY, JSON.stringify(payload.classSubjectMap))
      }
      setSampleDataLog(payload)
      setMessage('Temporary sample data generated successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate sample data.')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetSampleData = async () => {
    if (!window.confirm('Reset/remove generated sample test data?')) return
    setIsGenerating(true)
    try {
      const response = await fetch('/api/dev/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error('Failed to reset sample data')
      localStorage.removeItem(CLASS_SUBJECTS_KEY)
      setSampleDataLog(null)
      setMessage('Temporary sample data removed.')
    } catch {
      setMessage('Failed to reset sample data.')
    } finally {
      setIsGenerating(false)
    }
  }

  const mergeDuplicateSubjects = async () => {
    if (!window.confirm('Merge duplicate subjects with same name (case-insensitive)?')) return
    setIsGenerating(true)
    try {
      const response = await fetch('/api/dev/merge-subjects', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Failed to merge duplicate subjects')
      const mergeMap = (payload.mergeMap ?? {}) as Record<string, string>
      if (Object.keys(mergeMap).length > 0) {
        const rawMap = localStorage.getItem(CLASS_SUBJECTS_KEY)
        const classSubjectMap = rawMap ? (JSON.parse(rawMap) as ClassSubjectMap) : {}
        const updatedMap: ClassSubjectMap = {}
        Object.entries(classSubjectMap).forEach(([classId, subjectIds]) => {
          updatedMap[classId] = Array.from(new Set(subjectIds.map((id) => mergeMap[id] ?? id)))
        })
        localStorage.setItem(CLASS_SUBJECTS_KEY, JSON.stringify(updatedMap))
      }
      setSampleDataLog(payload)
      setMessage(payload.removedCount > 0 ? `Merged duplicates. Removed ${payload.removedCount} subject entries.` : 'No duplicate subjects found.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to merge duplicate subjects.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-4 space-y-3">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <Card className="space-y-3">
          <SectionTitle icon={Palette} title="Personalization" subtitle="Make Timable feel yours." />
          <Input label="School / Institution Name" value={prefs.schoolName} onChange={(e) => apply({ ...prefs, schoolName: e.target.value })} />
          <Input label="Academic Year / Session" value={prefs.academicYear} onChange={(e) => apply({ ...prefs, academicYear: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-gray-600">Theme
              <select className="mt-1 w-full rounded-xl border border-indigo-100 px-3 py-2 text-sm" value={prefs.theme} onChange={(e) => apply({ ...prefs, theme: e.target.value as typeof prefs.theme })}>
                <option value="light">light</option>
                <option value="dark">dark</option>
                <option value="system">system</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">Dashboard Layout
              <select className="mt-1 w-full rounded-xl border border-indigo-100 px-3 py-2 text-sm" value={prefs.dashboardLayout} onChange={(e) => apply({ ...prefs, dashboardLayout: e.target.value as typeof prefs.dashboardLayout })}>
                <option value="compact">compact</option>
                <option value="spacious">spacious</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold text-gray-600 inline-flex items-center gap-2">
            Accent Color <input type="color" value={prefs.accentColor} onChange={(e) => apply({ ...prefs, accentColor: e.target.value })} />
          </label>
        </Card>

        <Card className="space-y-3">
          <SectionTitle icon={SlidersHorizontal} title="App Behavior" subtitle="Simple switches for daily use." />
          {[
            ['onboardingTips', 'Onboarding tips'],
            ['animations', 'Animations'],
            ['notificationBars', 'Notification bars'],
            ['autoSaveDrafts', 'Auto-save drafts'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(prefs[key as keyof typeof prefs])}
                onChange={(e) => apply({ ...prefs, [key]: e.target.checked })}
              />
            </label>
          ))}
        </Card>

        <Card className="space-y-3">
          <SectionTitle icon={RefreshCcw} title="Data & Recovery" subtitle="Troubleshoot and self-serve safely." />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={exportData}><Download size={14} />Export data</Button>
            <label className="inline-flex">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) importData(e.target.files[0])
                }}
              />
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 px-4 py-3 text-sm font-semibold text-indigo-700 bg-indigo-50 cursor-pointer">
                <Upload size={14} />Import backup
              </span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={resetOnboarding}><RotateCcw size={14} />Reset onboarding</Button>
            <Button variant="danger" onClick={clearCache}>Clear cache</Button>
          </div>
        </Card>

        <Card className="space-y-3 border-amber-200 bg-amber-50/70">
          <SectionTitle icon={Beaker} title="Temporary Dev Tools" subtitle="Testing only. Remove before production." />
          <p className="text-xs text-amber-700">
            Generate realistic stress-test data for timetable engine collision testing.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={generateSampleData} disabled={isGenerating}>
              {isGenerating ? 'Working...' : 'Generate Sample Test Data'}
            </Button>
            <Button variant="secondary" onClick={resetSampleData} disabled={isGenerating}>
              Reset/Re-generate
            </Button>
          </div>
          <Button variant="ghost" onClick={mergeDuplicateSubjects} disabled={isGenerating}>
            <WandSparkles size={14} /> Merge duplicate subjects
          </Button>
          {sampleDataLog ? (
            <details className="rounded-xl border border-amber-200 bg-white p-2">
              <summary className="text-xs font-semibold text-amber-700 cursor-pointer">View generated dataset output</summary>
              <pre className="mt-2 text-[10px] overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(sampleDataLog, null, 2)}
              </pre>
            </details>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <SectionTitle icon={LifeBuoy} title="Support / Info" subtitle="Quick support and version details." />
          <p className="text-sm text-gray-700">Timable_v3 — Version 3 of Timable (original repo lineage)</p>
          <p className="text-sm text-gray-700">By Nayak-indie (Vinayak)</p>
          <a className="inline-flex" href="mailto:vnayiiik@gmail.com?subject=Timable_v3%20Feedback">
            <Button variant="ghost"><Info size={14} />Feedback / Report issue</Button>
          </a>
        </Card>

        {message ? <p className="text-xs text-indigo-700">{message}</p> : null}
      </motion.div>
    </div>
  )
}
