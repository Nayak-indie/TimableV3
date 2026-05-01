import type { ThemeMode } from '@/lib/preferences'

export function applyThemeToRoot(root: HTMLElement, theme: ThemeMode) {
  root.dataset.theme = theme
}
