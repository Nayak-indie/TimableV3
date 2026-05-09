'use client'

import { useEffect, useRef } from 'react'
import { DEV_DATA_SYNC_CHANNEL, DEV_DATA_SYNC_EVENT, DEV_DATA_SYNC_KEY } from './data-sync'

export function useDevDataSync(refresh: () => void | Promise<void>, deps: ReadonlyArray<unknown> = []) {
  const refreshRef = useRef(refresh)
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshRef.current()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [depsKey])

  useEffect(() => {
    const handler = () => {
      void refreshRef.current()
    }

    const storageHandler = (event: StorageEvent) => {
      if (event.key === DEV_DATA_SYNC_KEY) handler()
    }

    window.addEventListener(DEV_DATA_SYNC_EVENT, handler)
    window.addEventListener('storage', storageHandler)

    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(DEV_DATA_SYNC_CHANNEL) : null
    if (channel) channel.onmessage = handler

    return () => {
      window.removeEventListener(DEV_DATA_SYNC_EVENT, handler)
      window.removeEventListener('storage', storageHandler)
      channel?.close()
    }
  }, [])
}
