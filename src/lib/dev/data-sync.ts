'use client'

export const DEV_DATA_SYNC_EVENT = 'timable:dev-data-sync'
export const DEV_DATA_SYNC_KEY = 'timable_dev_data_sync_version'
export const DEV_DATA_SYNC_CHANNEL = 'timable-dev-data-sync'

export function emitDevDataSync() {
  if (typeof window === 'undefined') return
  const version = String(Date.now())
  window.localStorage.setItem(DEV_DATA_SYNC_KEY, version)
  window.dispatchEvent(new CustomEvent(DEV_DATA_SYNC_EVENT, { detail: { version } }))

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(DEV_DATA_SYNC_CHANNEL)
    channel.postMessage({ version })
    channel.close()
  }
}
