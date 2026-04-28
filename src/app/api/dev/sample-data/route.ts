import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateSampleData, resetSampleData } from '@/lib/dev/sampleData'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { action } = await request.json().catch(() => ({ action: 'generate' }))

  if (action === 'reset') {
    await resetSampleData(supabase)
    return NextResponse.json({ ok: true, action: 'reset' })
  }

  const payload = await generateSampleData(supabase)
  return NextResponse.json({ ok: true, action: 'generate', ...payload })
}
