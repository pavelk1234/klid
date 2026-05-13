import { AuthForm } from '@/components/auth-form'
import { t } from '@/lib/czech'

export const runtime = 'edge'

export default function AuthPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-3xl font-semibold text-klid-ink">{t.signIn}</h1>
      <p className="mb-8 text-klid-muted">{t.tagline}</p>
      <AuthForm />
    </div>
  )
}
