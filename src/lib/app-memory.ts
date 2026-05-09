'use client'

import { useSyncExternalStore } from 'react'
import type { DayOfWeek } from '@/types'

export type GenerateScope = 'week' | 'day'

export type HistoryEventType =
  | 'sample_data_generated'
  | 'sample_data_reset'
  | 'timetable_generated'
  | 'timetable_generate_failed'

export interface HistoryEvent {
  id: string
  at: string
  type: HistoryEventType
  title: string
  details?: string
  payload?: Record<string, unknown>
}

export interface SessionState {
  lastTermId?: string
  lastSelectedClassIds?: string[]
  generateScope?: GenerateScope
  generateDay?: DayOfWeek
  lastTimetableDay?: DayOfWeek
  lastActiveClassId?: string
  nexus?: {
    termId?: string
    day?: DayOfWeek
    period?: number | 'all'
    query?: string
  }
}

export interface AppMemory {
  version: 1
  session: SessionState
  history: HistoryEvent[]
}

const MEMORY_KEY = 'timable_memory_v3'
const MAX_HISTORY = 300
export const APP_MEMORY_EVENT = 'timable_memory_updated'

const defaultMemory: AppMemory = {
  version: 1,
  session: {},
  history: [],
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `mem_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function readAppMemory(): AppMemory {
  if (typeof window === 'undefined') return defaultMemory
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY)
    if (!raw) return defaultMemory
    const parsed = JSON.parse(raw) as Partial<AppMemory>
    if (parsed?.version !== 1) return defaultMemory
    return {
      ...defaultMemory,
      ...parsed,
      session: { ...defaultMemory.session, ...(parsed.session ?? {}) },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch {
    return defaultMemory
  }
}

export function writeAppMemory(next: AppMemory) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(APP_MEMORY_EVENT))
}

export function updateSessionState(patch: Partial<SessionState>) {
  const current = readAppMemory()
  writeAppMemory({
    ...current,
    session: { ...current.session, ...patch },
  })
}

export function appendHistoryEvent(event: Omit<HistoryEvent, 'id' | 'at'> & { id?: string; at?: string }) {
  const current = readAppMemory()
  const normalized: HistoryEvent = {
    id: event.id ?? createId(),
    at: event.at ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    details: event.details,
    payload: event.payload,
  }

  const nextHistory = [normalized, ...current.history].slice(0, MAX_HISTORY)
  writeAppMemory({ ...current, history: nextHistory })
}

export function clearAppMemory() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(MEMORY_KEY)
  window.dispatchEvent(new Event(APP_MEMORY_EVENT))
}

export function subscribeAppMemory(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(APP_MEMORY_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(APP_MEMORY_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

export function useAppMemory() {
  return useSyncExternalStore(subscribeAppMemory, readAppMemory, () => defaultMemory)
}
