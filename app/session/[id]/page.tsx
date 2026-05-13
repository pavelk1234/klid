import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/auth'
import { getSessionById, getUserById } from '@/lib/db'
import { SessionRoom } from '@/components/session-room'
import { t } from '@/lib/czech'

export const runtime = 'edge'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params
  const uid = await getSessionUserId()
  if (!uid) redirect('/auth')

  const session = await getSessionById(id)
  if (!session) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-klid-ink">{t.notFound}</main>
    )
  }
  const user = await getUserById(uid)
  if (!user) redirect('/auth')

  const isParticipant = session.creator_id === uid || session.partner_id === uid

  // If session is open and unassigned, allow anyone (kdokoliv-flow) to claim it on visit.
  if (!isParticipant) {
    if (session.status === 'open' && !session.partner_id && session.creator_id !== uid) {
      // Auto-claim: assign current user as partner.
      const { getDB } = await import('@/lib/db')
      await getDB()
        .prepare(`UPDATE sessions SET partner_id = ?, status = 'matched' WHERE id = ? AND status = 'open' AND partner_id IS NULL`)
        .bind(uid, id)
        .run()
    } else {
      return (
        <main className="mx-auto max-w-md px-6 py-12 text-klid-ink">{t.notFound}</main>
      )
    }
  }

  return (
    <SessionRoom
      sessionId={session.id}
      lengthMinutes={session.length_minutes}
      halfwayBell={user.halfway_bell === 1}
      displayName={user.name ?? ''}
    />
  )
}
