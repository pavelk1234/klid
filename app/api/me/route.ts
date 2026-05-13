import { NextResponse } from 'next/server'
import { getDB, getUserById } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export const runtime = 'edge'

export async function GET() {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const user = await getUserById(uid)
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ user })
}

interface Patch {
  name?: string
  timezone?: string
  preferred_length?: number
  preferred_frequency?: string
  halfway_bell?: boolean
}

export async function PATCH(req: Request) {
  const uid = await getSessionUserId()
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let patch: Patch
  try {
    patch = (await req.json()) as Patch
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const sets: string[] = []
  const args: (string | number)[] = []

  if (typeof patch.name === 'string' && patch.name.trim()) {
    sets.push('name = ?')
    args.push(patch.name.trim())
  }
  if (typeof patch.timezone === 'string' && patch.timezone.trim()) {
    sets.push('timezone = ?')
    args.push(patch.timezone.trim())
  }
  if (typeof patch.preferred_length === 'number' && [10, 20, 30, 45, 60].includes(patch.preferred_length)) {
    sets.push('preferred_length = ?')
    args.push(patch.preferred_length)
  }
  if (
    typeof patch.preferred_frequency === 'string' &&
    ['daily', '3x', '2x', '1x'].includes(patch.preferred_frequency)
  ) {
    sets.push('preferred_frequency = ?')
    args.push(patch.preferred_frequency)
  }
  if (typeof patch.halfway_bell === 'boolean') {
    sets.push('halfway_bell = ?')
    args.push(patch.halfway_bell ? 1 : 0)
  }

  if (sets.length === 0) return NextResponse.json({ ok: true })

  args.push(uid)
  const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
  await getDB().prepare(sql).bind(...args).run()

  const user = await getUserById(uid)
  return NextResponse.json({ user })
}
