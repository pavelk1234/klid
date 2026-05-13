import { redirect } from 'next/navigation'
import { getDB, getUserByEmail, upsertUserByEmail } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import { uuid } from '@/lib/utils'
import { t } from '@/lib/czech'

export const runtime = 'edge'

interface PageProps {
  searchParams: Promise<{ token?: string; next?: string }>
}

export default async function AuthCallbackPage({ searchParams }: PageProps) {
  const { token, next: nextParam } = await searchParams
  if (!token) {
    return <InvalidLink />
  }

  const db = getDB()
  const row = await db
    .prepare('SELECT * FROM auth_tokens WHERE token = ?')
    .bind(token)
    .first<{ token: string; email: string; expires_at: number; used: number }>()

  if (!row || row.used || row.expires_at < Date.now()) {
    return <InvalidLink />
  }

  // Mark used
  await db.prepare('UPDATE auth_tokens SET used = 1 WHERE token = ?').bind(token).run()

  // Upsert user
  let user = await getUserByEmail(row.email)
  if (!user) {
    user = await upsertUserByEmail(row.email, uuid())
  }

  await setSessionCookie(user.id)

  // First-time users go to onboarding; everyone else to dashboard.
  const target = nextParam && nextParam.startsWith('/') ? nextParam : user.name ? '/dashboard' : '/onboarding'
  redirect(target)
}

function InvalidLink() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-klid-ink">{t.linkInvalid}</h1>
      <a href="/auth" className="mt-4 text-klid-green underline-offset-4 hover:underline">
        {t.signIn}
      </a>
    </div>
  )
}
