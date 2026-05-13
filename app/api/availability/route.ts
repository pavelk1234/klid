import { NextResponse } from 'next/server'
import { getAvailabilityForUser, replaceAvailabilityForUser } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export const runtime = 'edge'

interface Slot {
  day_of_week: number
  start_minute: number
  end_minute: number
}

export async function GET() {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const rows = await getAvailabilityForUser(uid)
  return NextResponse.json({ availability: rows })
}

export async function PUT(req: Request) {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { slots: Slot[] }
  try {
    body = (await req.json()) as { slots: Slot[] }
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const clean: Slot[] = []
  for (const s of body.slots ?? []) {
    if (
      Number.isInteger(s.day_of_week) &&
      s.day_of_week >= 0 &&
      s.day_of_week <= 6 &&
      Number.isInteger(s.start_minute) &&
      Number.isInteger(s.end_minute) &&
      s.start_minute >= 0 &&
      s.end_minute > s.start_minute &&
      s.end_minute <= 24 * 60
    ) {
      clean.push(s)
    }
  }

  await replaceAvailabilityForUser(uid, clean)
  return NextResponse.json({ ok: true, count: clean.length })
}
