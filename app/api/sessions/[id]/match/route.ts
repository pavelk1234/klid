import { NextResponse } from 'next/server'
import { getDB, getSessionById, getUserById, getEnv } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { sendMatched } from '@/lib/email'
import { formatLocal } from '@/lib/utils'

export const runtime = 'edge'

interface Ctx {
  params: Promise<{ id: string }>
}

interface Body {
  partner_id?: string | null
  mode?: 'specific' | 'anyone'
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.creator_id !== uid) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (session.status !== 'open') {
    return NextResponse.json({ error: 'not_open' }, { status: 409 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const db = getDB()

  if (body.mode === 'anyone' || !body.partner_id) {
    // Stays open; cron will match at T-60min.
    return NextResponse.json({ ok: true, status: 'open' })
  }

  // Specific partner pick
  const partner = await getUserById(body.partner_id)
  if (!partner) return NextResponse.json({ error: 'partner_not_found' }, { status: 404 })

  await db
    .prepare(`UPDATE sessions SET partner_id = ?, status = 'matched' WHERE id = ?`)
    .bind(partner.id, id)
    .run()

  // Notify the partner that they've been booked.
  const env = getEnv()
  try {
    const whenLocal = formatLocal(session.scheduled_at, partner.timezone ?? 'Europe/Prague')
    await sendMatched(
      { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, appUrl: env.NEXT_PUBLIC_APP_URL },
      partner.email,
      id,
      whenLocal
    )
  } catch {
    // Don't fail the match if email is down — cron will pick up reminders later.
  }

  return NextResponse.json({ ok: true, status: 'matched' })
}
