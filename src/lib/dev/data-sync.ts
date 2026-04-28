'use client'

export const DEV_DATA_SYNC_EVENT = 'timable:dev-data-sync'

export function emitDevDataSync() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DEV_DATA_SYNC_EVENT))
}

