import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/czech'

export const runtime = 'edge'

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-6 px-6 py-12">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-breathe rounded-full bg-klid-green" aria-hidden />
        <span className="text-sm font-medium uppercase tracking-wider text-klid-muted">
          {t.appName}
        </span>
      </div>
      <h1 className="text-5xl font-semibold leading-tight text-klid-ink">{t.tagline}.</h1>
      <p className="max-w-sm text-klid-muted">
        Naplánuj si sezení. Najdeme ti partnera. Sedneš si s ním na 10 až 60 minut.
      </p>
      <div className="mt-2 flex gap-3">
        <Button asChild size="lg">
          <Link href="/auth">{t.signIn}</Link>
        </Button>
      </div>
    </main>
  )
}
