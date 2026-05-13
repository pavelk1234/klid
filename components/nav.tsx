'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/czech'

export function Nav() {
  const router = useRouter()

  async function onSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="border-b border-klid-line bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-klid-green" aria-hidden />
          <span className="font-semibold tracking-tight text-klid-ink">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">{t.settings}</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            {t.signOut}
          </Button>
        </div>
      </div>
    </nav>
  )
}
