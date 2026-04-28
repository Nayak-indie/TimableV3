'use client'

import Button from '@/components/ui/Button'
import { OPEN_SETUP_HELPER_EVENT } from '@/lib/dev/onboarding'

export default function SetupHelperButton() {
  return (
    <Button
      variant="ghost"
      className="shrink-0 !px-3 !py-2 !text-xs"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETUP_HELPER_EVENT))}
    >
      Open helper
    </Button>
  )
}
