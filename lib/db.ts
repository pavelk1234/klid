import { getCloudflareContext } from '@opennextjs/cloudflare'

export function getDB(): D1Database {
  return getCloudflareContext().env.DB
}

export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env as unknown as CloudflareEnv
}

// --- Row types ---

export interface UserRow {
  id: string
  email: string
  name: string | null
  timezone: string | null
  preferred_length: number | null
  preferred_frequency: string | null
  halfway_bell: number
  created_at: number
}

export interface SessionRow {
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

export interface AvailabilityRow {
  id: string
  user_id: string
  day_of_week: number
  start_minute: number
  end_minute: number
}

export interface AuthTokenRow {
  token: string
  email: string
  expires_at: number
  used: number
}

// --- Query helpers ---

export async function getUserById(id: string): Promise<UserRow | null> {
  const db = getDB()
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  return row ?? null
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDB()
  const row = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<UserRow>()
  return row ?? null
}

export async function upsertUserByEmail(email: string, id: string): Promise<UserRow> {
  const db = getDB()
  const existing = await getUserByEmail(email)
  if (existing) return existing
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO users (id, email, halfway_bell, created_at) VALUES (?, ?, 0, ?)`
    )
    .bind(id, email.toLowerCase(), now)
    .run()
  return {
    id,
    email: email.toLowerCase(),
    name: null,
    timezone: null,
    preferred_length: null,
    preferred_frequency: null,
    halfway_bell: 0,
    created_at: now,
  }
}

export async function getAvailabilityForUser(userId: string): Promise<AvailabilityRow[]> {
  const db = getDB()
  const res = await db
    .prepare('SELECT * FROM availability WHERE user_id = ? ORDER BY day_of_week, start_minute')
    .bind(userId)
    .all<AvailabilityRow>()
  return res.results ?? []
}

export async function replaceAvailabilityForUser(
  userId: string,
  slots: { day_of_week: number; start_minute: number; end_minute: number }[]
): Promise<void> {
  const db = getDB()
  await db.prepare('DELETE FROM availability WHERE user_id = ?').bind(userId).run()
  for (const s of slots) {
    const id = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO availability (id, user_id, day_of_week, start_minute, end_minute)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, userId, s.day_of_week, s.start_minute, s.end_minute)
      .run()
  }
}

export async function getSessionById(id: string): Promise<SessionRow | null> {
  const db = getDB()
  const row = await db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first<SessionRow>()
  return row ?? null
}

export async function getUpcomingSessionsForUser(userId: string): Promise<SessionRow[]> {
  const db = getDB()
  const now = Date.now()
  const res = await db
    .prepare(
      `SELECT * FROM sessions
       WHERE (creator_id = ?1 OR partner_id = ?1)
         AND status IN ('open','matched')
         AND scheduled_at + length_minutes * 60000 > ?2
       ORDER BY scheduled_at ASC`
    )
    .bind(userId, now)
    .all<SessionRow>()
  return res.results ?? []
}

export async function getPastSessionsForUser(userId: string, limit = 20): Promise<SessionRow[]> {
  const db = getDB()
  const now = Date.now()
  const res = await db
    .prepare(
      `SELECT * FROM sessions
       WHERE (creator_id = ?1 OR partner_id = ?1)
         AND (status IN ('completed','cancelled') OR scheduled_at + length_minutes * 60000 <= ?2)
       ORDER BY scheduled_at DESC
       LIMIT ?3`
    )
    .bind(userId, now, limit)
    .all<SessionRow>()
  return res.results ?? []
}
