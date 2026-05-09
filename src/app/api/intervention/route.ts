import { NextRequest, NextResponse } from 'next/server'
import { executeIntervention } from '@/lib/intervention/live-intervention'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, context } = body

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    const result = await executeIntervention({ command, context })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Intervention Error:', error)
    return NextResponse.json({ error: error.message || 'Intervention failed' }, { status: 500 })
  }
}
