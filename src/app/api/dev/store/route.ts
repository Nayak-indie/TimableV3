export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readDevDbFile, writeDevDbFile } from '@/lib/dev/dev-db.server'
import { normalizeDevDb } from '@/lib/dev/dev-db'

export async function GET() {
  const db = await readDevDbFile()
  return NextResponse.json({ ok: true, db })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload?.db) {
    return NextResponse.json({ ok: false, error: 'Missing database payload.' }, { status: 400 })
  }

  const db = normalizeDevDb(payload.db)
  await writeDevDbFile(db)
  return NextResponse.json({ ok: true })
}
