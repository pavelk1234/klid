import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { SettingsForm } from '@/components/settings-form'
import { AvailabilityEditor } from '@/components/availability-editor'
import { getSessionUserId } from '@/lib/auth'
import { getAvailabilityForUser, getUserById } from '@/lib/db'
import { t } from '@/lib/czech'

export const runtime = 'edge'

export default async function SettingsPage() {
  const uid = await getSessionUserId()
  if (!uid) redirect('/auth')
  const user = await getUserById(uid)
  if (!user) redirect('/auth')
  const availability = await getAvailabilityForUser(uid)

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl space-y-12 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-klid-ink">{t.settings}</h1>
        </header>

        <SettingsForm
          initial={{
            name: user.name ?? '',
            timezone: user.timezone ?? 'Europe/Prague',
            preferred_length: user.preferred_length ?? 20,
            preferred_frequency: user.preferred_frequency ?? 'daily',
            halfway_bell: user.halfway_bell === 1,
          }}
        />

        <section>
          <h2 className="mb-3 text-lg font-semibold text-klid-ink">{t.availability}</h2>
          <AvailabilityEditor
            initial={availability.map(a => ({
              day_of_week: a.day_of_week,
              start_minute: a.start_minute,
              end_minute: a.end_minute,
            }))}
          />
        </section>
      </main>
    </>
  )
}
