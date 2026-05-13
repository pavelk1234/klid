'use client'

import Link from 'next/link'
import type { SessionRow } from '@/lib/db'
import { formatLocal } from '@/lib/utils'
import { t } from '@/lib/czech'

interface Props {
  currentUserId: string
  userTimezone: string
  upcoming: SessionRow[]
  past: SessionRow[]
  others: Record<string, { name: string | null; timezone: string | null }>
}

export function SessionList({ currentUserId, userTimezone, upcoming, past, others }: Props) {
  return (
    <div className="space-y-10">
      <Section
        title={t.upcomingSessions}
        empty={t.noUpcoming}
        sessions={upcoming}
        currentUserId={currentUserId}
        userTimezone={userTimezone}
        others={others}
        joinable
      />
      <Section
        title={t.pastSessions}
        empty={t.noPast}
        sessions={past}
        currentUserId={currentUserId}
        userTimezone={userTimezone}
        others={others}
      />
    </div>
  )
}

interface SectionProps extends Omit<Props, 'upcoming' | 'past'> {
  title: string
  empty: string
  sessions: SessionRow[]
  joinable?: boolean
}

function Section({
  title,
  empty,
  sessions,
  currentUserId,
  userTimezone,
  others,
  joinable,
}: SectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-klid-muted">
        {title}
      </h2>
      {sessions.length === 0 ? (
        <p className="text-klid-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-klid-line rounded-md border border-klid-line bg-white">
          {sessions.map(s => {
            const otherId = s.creator_id === currentUserId ? s.partner_id : s.creator_id
            const other = otherId ? others[otherId] : null
            const partnerLabel = other?.name ?? (s.partner_id ? '—' : t.anyone)
            const status =
              s.status === 'open'
                ? t.statusOpen
                : s.status === 'matched'
                ? t.statusMatched
                : s.status === 'completed'
                ? t.statusCompleted
                : t.statusCancelled
            return (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <div className="text-base text-klid-ink">
                    {formatLocal(s.scheduled_at, userTimezone)} · {s.length_minutes} min
                  </div>
                  <div className="text-sm text-klid-muted">
                    {partnerLabel} · {status}
                  </div>
                </div>
                {joinable && (s.status === 'matched' || s.status === 'open') && (
                  <Link
                    href={`/session/${s.id}`}
                    className="rounded-md border border-klid-line px-3 py-1.5 text-sm font-medium text-klid-ink hover:bg-neutral-50"
                  >
                    {t.join}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
