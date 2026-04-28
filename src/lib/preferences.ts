export type ThemeMode = 'dusk-blue' | 'dark-night' | 'starry-night' | 'glow-sun'
export type LayoutMode = 'compact' | 'spacious'

export interface AppPreferences {
  schoolName: string
  academicYear: string
  theme: ThemeMode
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
  theme: 'dusk-blue',
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
