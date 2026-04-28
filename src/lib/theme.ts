import type { ThemeMode } from '@/lib/preferences'

type ThemeTokens = {
  name: string
  background: string
  backgroundSecondary: string
  surface: string
  surfaceElevated: string
  textPrimary: string
  textSecondary: string
  border: string
  accent: string
  accentHover: string
  accentSoft: string
  buttonText: string
  shadow: string
  grid: string
}

export const THEME_TOKENS: Record<ThemeMode, ThemeTokens> = {
  'dusk-blue': {
    name: 'Dusk Blue',
    background: '#eef4ff',
    backgroundSecondary: '#dce8ff',
    surface: 'rgba(255, 255, 255, 0.84)',
    surfaceElevated: 'rgba(245, 250, 255, 0.96)',
    textPrimary: '#16324f',
    textSecondary: '#4b6786',
    border: 'rgba(79, 126, 200, 0.18)',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentSoft: 'rgba(59, 130, 246, 0.14)',
    buttonText: '#ffffff',
    shadow: '0 18px 50px rgba(59, 130, 246, 0.12)',
    grid: 'rgba(59, 130, 246, 0.07)',
  },
  'dark-night': {
    name: 'Dark Night',
    background: '#070b14',
    backgroundSecondary: '#111827',
    surface: 'rgba(15, 23, 42, 0.88)',
    surfaceElevated: 'rgba(20, 29, 48, 0.98)',
    textPrimary: '#e5eefc',
    textSecondary: '#9db0cb',
    border: 'rgba(148, 163, 184, 0.18)',
    accent: '#60a5fa',
    accentHover: '#3b82f6',
    accentSoft: 'rgba(96, 165, 250, 0.18)',
    buttonText: '#f8fbff',
    shadow: '0 22px 60px rgba(0, 0, 0, 0.45)',
    grid: 'rgba(148, 163, 184, 0.08)',
  },
  'starry-night': {
    name: 'Starry Night',
    background: '#050816',
    backgroundSecondary: '#111634',
    surface: 'rgba(12, 17, 39, 0.9)',
    surfaceElevated: 'rgba(19, 24, 53, 0.98)',
    textPrimary: '#edf3ff',
    textSecondary: '#a9b7d7',
    border: 'rgba(129, 140, 248, 0.2)',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentSoft: 'rgba(139, 92, 246, 0.2)',
    buttonText: '#ffffff',
    shadow: '0 22px 64px rgba(3, 8, 28, 0.55)',
    grid: 'rgba(139, 92, 246, 0.1)',
  },
  'glow-sun': {
    name: 'Glow Sun',
    background: '#fff9ef',
    backgroundSecondary: '#fff1d6',
    surface: 'rgba(255, 255, 255, 0.88)',
    surfaceElevated: 'rgba(255, 251, 241, 0.98)',
    textPrimary: '#4a3212',
    textSecondary: '#7b5b30',
    border: 'rgba(214, 158, 46, 0.2)',
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentSoft: 'rgba(245, 158, 11, 0.16)',
    buttonText: '#ffffff',
    shadow: '0 18px 48px rgba(214, 158, 46, 0.16)',
    grid: 'rgba(245, 158, 11, 0.08)',
  },
}

export function resolveThemeTokens(theme: ThemeMode) {
  return THEME_TOKENS[theme] ?? THEME_TOKENS['dusk-blue']
}

export function applyThemeToRoot(root: HTMLElement, theme: ThemeMode) {
  const tokens = resolveThemeTokens(theme)
  root.dataset.theme = theme
  root.style.setProperty('--accent', tokens.accent)
  root.style.setProperty('--accent-hover', tokens.accentHover)
  root.style.setProperty('--accent-soft', tokens.accentSoft)
  root.style.setProperty('--bg-primary', tokens.background)
  root.style.setProperty('--bg-secondary', tokens.backgroundSecondary)
  root.style.setProperty('--surface-primary', tokens.surface)
  root.style.setProperty('--surface-secondary', tokens.surfaceElevated)
  root.style.setProperty('--text-primary', tokens.textPrimary)
  root.style.setProperty('--text-secondary', tokens.textSecondary)
  root.style.setProperty('--border-color', tokens.border)
  root.style.setProperty('--button-text', tokens.buttonText)
  root.style.setProperty('--shadow-primary', tokens.shadow)
  root.style.setProperty('--grid-line', tokens.grid)
}
