import { NextResponse } from 'next/server'
import { getUserById } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { findCandidates } from '@/lib/matching'

export const runtime = 'edge'

export async function GET(req: Request) {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const scheduledAt = Number(url.searchParams.get('scheduled_at'))
  const lengthMinutes = Number(url.searchParams.get('length_minutes'))
  if (!Number.isFinite(scheduledAt) || !Number.isFinite(lengthMinutes)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (![10, 20, 30, 45, 60].includes(lengthMinutes)) {
    return NextResponse.json({ error: 'bad_length' }, { status: 400 })
  }

  const creator = await getUserById(uid)
  if (!creator) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const candidates = await findCandidates({
    scheduled_at: scheduledAt,
    length_minutes: lengthMinutes,
    creator,
    limit: 5,
  })

  return NextResponse.json({ candidates })
}
