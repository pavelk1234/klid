import { NextResponse } from 'next/server'
import { getDB, getSessionById } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export const runtime = 'edge'

interface Ctx {
  params: Promise<{ id: string }>
}

// Marks a session as completed. Thank-you emails are sent by the cron worker
// next time it runs (within 5 min).
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.creator_id !== uid && session.partner_id !== uid) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (session.status === 'completed') return NextResponse.json({ ok: true })

  await getDB()
    .prepare(`UPDATE sessions SET status = 'completed' WHERE id = ?`)
    .bind(id)
    .run()
  return NextResponse.json({ ok: true })
}
