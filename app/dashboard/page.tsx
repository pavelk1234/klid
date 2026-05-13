import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { SessionList } from '@/components/session-list'
import { getSessionUserId } from '@/lib/auth'
import {
  getPastSessionsForUser,
  getUpcomingSessionsForUser,
  getUserById,
} from '@/lib/db'
import { t } from '@/lib/czech'

export const runtime = 'edge'

export default async function DashboardPage() {
  const uid = await getSessionUserId()
  if (!uid) redirect('/auth')
  const user = await getUserById(uid)
  if (!user) redirect('/auth')
  if (!user.name) redirect('/onboarding')

  const [upcoming, past] = await Promise.all([
    getUpcomingSessionsForUser(uid),
    getPastSessionsForUser(uid),
  ])

  const others: Record<string, { name: string | null; timezone: string | null }> = {}
  const otherIds = new Set<string>()
  for (const s of [...upcoming, ...past]) {
    if (s.creator_id !== uid) otherIds.add(s.creator_id)
    if (s.partner_id && s.partner_id !== uid) otherIds.add(s.partner_id)
  }
  for (const id of otherIds) {
    const u = await getUserById(id)
    if (u) others[id] = { name: u.name, timezone: u.timezone }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-klid-ink">
            {t.welcome}, {user.name}
          </h1>
          <Button asChild>
            <Link href="/schedule">{t.scheduleSession}</Link>
          </Button>
        </div>
        <SessionList
          currentUserId={uid}
          userTimezone={user.timezone ?? 'Europe/Prague'}
          upcoming={upcoming}
          past={past}
          others={others}
        />
      </main>
    </>
  )
}
