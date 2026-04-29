import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateSampleData, resetSampleData } from '@/lib/dev/sampleData'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { action } = await request.json().catch(() => ({ action: 'generate' }))

  try {
    if (action === 'reset') {
      await resetSampleData(supabase)
      revalidatePath('/')
      revalidatePath('/setup')
      revalidatePath('/changes')
      revalidatePath('/timetable')
      return NextResponse.json({ ok: true, action: 'reset' })
    }

    const payload = await generateSampleData(supabase)
    revalidatePath('/')
    revalidatePath('/setup')
    revalidatePath('/changes')
    revalidatePath('/timetable')
    return NextResponse.json({ ok: true, action: 'generate', ...payload })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate sample data'
    return NextResponse.json({ ok: false, action, error: message }, { status: 500 })
  }
}
