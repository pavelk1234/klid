import { NextResponse } from 'next/server'
import {
  getDB,
  getUserById,
  getUpcomingSessionsForUser,
  getPastSessionsForUser,
} from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { uuid } from '@/lib/utils'
import { jitsiRoomName } from '@/lib/jitsi'

export const runtime = 'edge'

export async function GET() {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [upcoming, past] = await Promise.all([
    getUpcomingSessionsForUser(uid),
    getPastSessionsForUser(uid),
  ])

  // Pull display names for partners so the UI doesn't need a second round-trip.
  const otherIds = new Set<string>()
  for (const s of [...upcoming, ...past]) {
    if (s.creator_id !== uid) otherIds.add(s.creator_id)
    if (s.partner_id && s.partner_id !== uid) otherIds.add(s.partner_id)
  }
  const others: Record<string, { name: string | null; timezone: string | null }> = {}
  for (const id of otherIds) {
    const u = await getUserById(id)
    if (u) others[id] = { name: u.name, timezone: u.timezone }
  }

  return NextResponse.json({ upcoming, past, others })
}

interface CreateBody {
  scheduled_at: number
  length_minutes: number
}

export async function POST(req: Request) {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  if (
    typeof body.scheduled_at !== 'number' ||
    !Number.isFinite(body.scheduled_at) ||
    body.scheduled_at < Date.now()
  ) {
    return NextResponse.json({ error: 'bad_scheduled_at' }, { status: 400 })
  }
  if (![10, 20, 30, 45, 60].includes(body.length_minutes)) {
    return NextResponse.json({ error: 'bad_length' }, { status: 400 })
  }

  const id = uuid()
  const room = jitsiRoomName(id)
  const now = Date.now()
  await getDB()
    .prepare(
      `INSERT INTO sessions
        (id, scheduled_at, length_minutes, creator_id, partner_id, status, jitsi_room, created_at)
       VALUES (?, ?, ?, ?, NULL, 'open', ?, ?)`
    )
    .bind(id, body.scheduled_at, body.length_minutes, uid, room, now)
    .run()

  return NextResponse.json({ id, jitsi_room: room })
}
