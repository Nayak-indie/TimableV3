'use client'

import { useEffect, useRef } from 'react'
import { DEV_DATA_SYNC_EVENT } from './data-sync'

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

    window.addEventListener(DEV_DATA_SYNC_EVENT, handler)
    return () => window.removeEventListener(DEV_DATA_SYNC_EVENT, handler)
  }, [])
}
