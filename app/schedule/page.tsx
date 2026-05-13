import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { ScheduleForm } from '@/components/schedule-form'
import { getSessionUserId } from '@/lib/auth'
import { getUserById } from '@/lib/db'
import { t } from '@/lib/czech'

export const runtime = 'edge'

export default async function SchedulePage() {
  const uid = await getSessionUserId()
  if (!uid) redirect('/auth')
  const user = await getUserById(uid)
  if (!user) redirect('/auth')
  if (!user.name) redirect('/onboarding')

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-klid-ink">{t.scheduleSession}</h1>
        <ScheduleForm
          userTimezone={user.timezone ?? 'Europe/Prague'}
          preferredLength={user.preferred_length ?? 20}
        />
      </main>
    </>
  )
}
