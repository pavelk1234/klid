import { NextResponse } from 'next/server'
import { getDB, getSessionById } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export const runtime = 'edge'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.creator_id !== uid && session.partner_id !== uid && session.status !== 'open') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json({ session })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.creator_id !== uid) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (session.status === 'completed') {
    return NextResponse.json({ error: 'already_completed' }, { status: 409 })
  }
  await getDB()
    .prepare(`UPDATE sessions SET status = 'cancelled' WHERE id = ?`)
    .bind(id)
    .run()
  return NextResponse.json({ ok: true })
}
