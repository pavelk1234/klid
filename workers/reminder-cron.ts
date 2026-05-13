// Cloudflare Worker — runs every 5 minutes (see wrangler.cron.toml).
// Sends 24h confirmations, 15-min reminders, thank-you notes,
// and auto-matches "kdokoliv" sessions one hour before they start.

import { t } from '../lib/czech'

interface Env {
  DB: D1Database
  RESEND_API_KEY: string
  EMAIL_FROM: string
  NEXT_PUBLIC_APP_URL: string
}

interface UserRow {
  id: string
  email: string
  name: string | null
  timezone: string | null
  preferred_length: number | null
}

interface SessionRow {
  id: string
  scheduled_at: number
  length_minutes: number
  creator_id: string
  partner_id: string | null
  status: 'open' | 'matched' | 'completed' | 'cancelled'
  jitsi_room: string
  reminder_15m_sent_at: number | null
  reminder_24h_sent_at: number | null
  thanks_sent_at: number | null
  created_at: number
}

interface AvailabilityRow {
  user_id: string
  day_of_week: number
  start_minute: number
  end_minute: number
}

const MIN = 60_000
const HOUR = 60 * MIN

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = Date.now()
    await Promise.allSettled([
      send15mReminders(env, now),
      send24hConfirmations(env, now),
      sendThanks(env, now),
      autoMatchOpen(env, now),
    ])
  },

  // Allow manual invocation locally via `curl /__scheduled`
  async fetch(_req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    ctx.waitUntil(this.scheduled({} as ScheduledEvent, env, ctx))
    return new Response('ok')
  },
}

// ---- Tasks ----

async function send15mReminders(env: Env, now: number) {
  const lower = now + 10 * MIN
  const upper = now + 20 * MIN
  const res = await env.DB.prepare(
    `SELECT * FROM sessions
      WHERE scheduled_at BETWEEN ? AND ?
        AND reminder_15m_sent_at IS NULL
        AND status IN ('open','matched')`
  )
    .bind(lower, upper)
    .all<SessionRow>()
  for (const s of res.results ?? []) {
    const recipients = await getRecipients(env, s)
    for (const u of recipients) {
      try {
        await sendEmail(env, {
          to: u.email,
          subject: t.emailReminderSubject,
          text: t.emailReminderBody(`${env.NEXT_PUBLIC_APP_URL}/session/${s.id}`),
        })
      } catch {}
    }
    await env.DB.prepare(`UPDATE sessions SET reminder_15m_sent_at = ? WHERE id = ?`)
      .bind(now, s.id)
      .run()
  }
}

async function send24hConfirmations(env: Env, now: number) {
  const lower = now + 23 * HOUR
  const upper = now + 25 * HOUR
  const res = await env.DB.prepare(
    `SELECT * FROM sessions
      WHERE scheduled_at BETWEEN ? AND ?
        AND reminder_24h_sent_at IS NULL
        AND status = 'matched'`
  )
    .bind(lower, upper)
    .all<SessionRow>()
  for (const s of res.results ?? []) {
    const recipients = await getRecipients(env, s)
    for (const u of recipients) {
      try {
        const whenLocal = formatLocal(s.scheduled_at, u.timezone ?? 'Europe/Prague')
        await sendEmail(env, {
          to: u.email,
          subject: t.emailConfirmationSubject,
          text: t.emailConfirmationBody(
            whenLocal,
            `${env.NEXT_PUBLIC_APP_URL}/session/${s.id}`
          ),
        })
      } catch {}
    }
    await env.DB.prepare(`UPDATE sessions SET reminder_24h_sent_at = ? WHERE id = ?`)
      .bind(now, s.id)
      .run()
  }
}

async function sendThanks(env: Env, now: number) {
  const res = await env.DB.prepare(
    `SELECT * FROM sessions WHERE status = 'completed' AND thanks_sent_at IS NULL`
  ).all<SessionRow>()
  for (const s of res.results ?? []) {
    const recipients = await getRecipients(env, s)
    for (const u of recipients) {
      try {
        await sendEmail(env, {
          to: u.email,
          subject: t.emailThanksSubject,
          text: t.emailThanksBody,
        })
      } catch {}
    }
    await env.DB.prepare(`UPDATE sessions SET thanks_sent_at = ? WHERE id = ?`)
      .bind(now, s.id)
      .run()
  }
}

// At T-60min, try to match any still-open session to a user with overlapping availability.
async function autoMatchOpen(env: Env, now: number) {
  const lower = now + 50 * MIN
  const upper = now + 70 * MIN
  const res = await env.DB.prepare(
    `SELECT * FROM sessions
      WHERE scheduled_at BETWEEN ? AND ?
        AND status = 'open'
        AND partner_id IS NULL`
  )
    .bind(lower, upper)
    .all<SessionRow>()

  for (const s of res.results ?? []) {
    const candidates = await findCandidatesForSession(env, s)
    if (candidates.length === 0) {
      // Cancel + email creator.
      await env.DB.prepare(`UPDATE sessions SET status = 'cancelled' WHERE id = ?`).bind(s.id).run()
      const creator = await getUser(env, s.creator_id)
      if (creator) {
        try {
          await sendEmail(env, {
            to: creator.email,
            subject: t.emailCancelledSubject,
            text: t.emailCancelledBody,
          })
        } catch {}
      }
      continue
    }

    const partner = candidates[0]
    await env.DB.prepare(
      `UPDATE sessions SET partner_id = ?, status = 'matched' WHERE id = ?`
    )
      .bind(partner.id, s.id)
      .run()

    const creator = await getUser(env, s.creator_id)
    const recipients = [creator, partner].filter(Boolean) as UserRow[]
    for (const u of recipients) {
      try {
        const whenLocal = formatLocal(s.scheduled_at, u.timezone ?? 'Europe/Prague')
        await sendEmail(env, {
          to: u.email,
          subject: t.emailMatchedSubject,
          text: t.emailMatchedBody(whenLocal, `${env.NEXT_PUBLIC_APP_URL}/session/${s.id}`),
        })
      } catch {}
    }
  }
}

// ---- Helpers ----

async function getUser(env: Env, id: string): Promise<UserRow | null> {
  const row = await env.DB.prepare(
    `SELECT id, email, name, timezone, preferred_length FROM users WHERE id = ?`
  )
    .bind(id)
    .first<UserRow>()
  return row ?? null
}

async function getRecipients(env: Env, s: SessionRow): Promise<UserRow[]> {
  const ids = [s.creator_id, s.partner_id].filter(Boolean) as string[]
  const out: UserRow[] = []
  for (const id of ids) {
    const u = await getUser(env, id)
    if (u) out.push(u)
  }
  return out
}

async function findCandidatesForSession(env: Env, s: SessionRow): Promise<UserRow[]> {
  const endAt = s.scheduled_at + s.length_minutes * MIN
  const users = await env.DB.prepare(
    `SELECT id, email, name, timezone, preferred_length FROM users
      WHERE id != ? AND timezone IS NOT NULL AND name IS NOT NULL`
  )
    .bind(s.creator_id)
    .all<UserRow>()

  const avail = await env.DB.prepare(
    `SELECT user_id, day_of_week, start_minute, end_minute FROM availability`
  ).all<AvailabilityRow>()

  const slotsByUser = new Map<string, AvailabilityRow[]>()
  for (const a of avail.results ?? []) {
    const arr = slotsByUser.get(a.user_id) ?? []
    arr.push(a)
    slotsByUser.set(a.user_id, arr)
  }

  const matches: UserRow[] = []
  for (const u of users.results ?? []) {
    if (!u.timezone) continue
    const slots = slotsByUser.get(u.id)
    if (!slots) continue
    const localStart = utcToLocal(s.scheduled_at, u.timezone)
    const localEnd = utcToLocal(endAt, u.timezone)
    if (localStart.dow !== localEnd.dow) continue
    const fits = slots.some(
      x =>
        x.day_of_week === localStart.dow &&
        x.start_minute <= localStart.minute &&
        x.end_minute >= localEnd.minute
    )
    if (fits) matches.push(u)
  }
  return matches
}

function utcToLocal(atMs: number, timezone: string): { dow: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(atMs))
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  let dow = 0
  let h = 0
  let m = 0
  for (const p of parts) {
    if (p.type === 'weekday') dow = wd[p.value] ?? 0
    if (p.type === 'hour') h = parseInt(p.value, 10)
    if (p.type === 'minute') m = parseInt(p.value, 10)
  }
  return { dow, minute: h * 60 + m }
}

function formatLocal(atMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(atMs))
}

async function sendEmail(env: Env, args: { to: string; subject: string; text: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      text: args.text,
    }),
  })
  if (!res.ok) throw new Error(`resend ${res.status}`)
}
