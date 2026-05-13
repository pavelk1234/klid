import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/auth'
import { getUserById } from '@/lib/db'
import { OnboardingForm } from '@/components/onboarding-form'
import { t } from '@/lib/czech'

export const runtime = 'edge'

export default async function OnboardingPage() {
  const uid = await getSessionUserId()
  if (!uid) redirect('/auth')
  const user = await getUserById(uid)
  if (!user) redirect('/auth')

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-2 text-3xl font-semibold text-klid-ink">{t.welcome}</h1>
      <p className="mb-8 text-klid-muted">{t.tagline}</p>
      <OnboardingForm
        initial={{
          name: user.name,
          timezone: user.timezone,
          preferred_length: user.preferred_length,
          preferred_frequency: user.preferred_frequency,
        }}
      />
    </main>
  )
}
