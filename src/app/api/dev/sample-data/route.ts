import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateSampleData, resetSampleData } from '@/lib/dev/sampleData'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

export async function POST(request: NextRequest) {
  const { action } = await request.json().catch(() => ({ action: 'generate' }))

  try {
    const supabase = createServerSupabaseClient()
    if (action === 'reset') {
      await resetSampleData(supabase)
      revalidatePath('/')
      revalidatePath('/setup')
      revalidatePath('/changes')
      revalidatePath('/timetable')
      return NextResponse.json({ ok: true, action: 'reset' }, { headers: noStoreHeaders })
    }

    const payload = await generateSampleData(supabase)
    revalidatePath('/')
    revalidatePath('/setup')
    revalidatePath('/changes')
    revalidatePath('/timetable')
    return NextResponse.json({ ok: true, action: 'generate', ...payload }, { headers: noStoreHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate sample data'
    return NextResponse.json({ ok: false, action, error: message }, { status: 500, headers: noStoreHeaders })
  }
}
