export type ThemeMode = 'light' | 'dark' | 'system'
export type LayoutMode = 'compact' | 'spacious'

export interface AppPreferences {
  schoolName: string
  academicYear: string
  theme: ThemeMode
  accentColor: string
  dashboardLayout: LayoutMode
  onboardingTips: boolean
  animations: boolean
  notificationBars: boolean
  autoSaveDrafts: boolean
}

export const PREFS_KEY = 'timable_preferences_v3'

export const defaultPreferences: AppPreferences = {
  schoolName: 'School Timetable',
  academicYear: '2026-27',
  theme: 'system',
  accentColor: '#6366f1',
  dashboardLayout: 'spacious',
  onboardingTips: true,
  animations: true,
  notificationBars: true,
  autoSaveDrafts: true,
}

export function readPreferences(): AppPreferences {
  if (typeof window === 'undefined') return defaultPreferences
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return defaultPreferences
    return { ...defaultPreferences, ...(JSON.parse(raw) as Partial<AppPreferences>) }
  } catch {
    return defaultPreferences
  }
}

export function writePreferences(next: AppPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
}
