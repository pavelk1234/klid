import { getDB } from './db'
import type { UserRow, AvailabilityRow } from './db'
import { tzOffsetMinutes, utcToLocal } from './utils'

export interface Candidate {
  user_id: string
  name: string | null
  timezone: string | null
  preferred_length: number | null
  rank: number // lower is better
}

interface MatchArgs {
  scheduled_at: number // unix ms UTC
  length_minutes: number
  creator: UserRow
  limit?: number
}

// Find up to N other users whose availability covers [scheduled_at, scheduled_at+length].
// "Covers" is checked in each candidate's local timezone — the slot must fall entirely
// within one of their availability windows for that day_of_week.
//
// Ranking:
//   1. Same preferred_length wins
//   2. Then smaller absolute timezone-offset diff vs creator wins
export async function findCandidates({
  scheduled_at,
  length_minutes,
  creator,
  limit = 5,
}: MatchArgs): Promise<Candidate[]> {
  const db = getDB()
  const endAt = scheduled_at + length_minutes * 60_000

  // Pull all candidate users (with timezone + availability set) excluding the creator.
  const usersRes = await db
    .prepare(
      `SELECT * FROM users
       WHERE id != ?1
         AND timezone IS NOT NULL
         AND name IS NOT NULL`
    )
    .bind(creator.id)
    .all<UserRow>()
  const users = usersRes.results ?? []
  if (users.length === 0) return []

  const availRes = await db
    .prepare(`SELECT * FROM availability WHERE user_id IN (SELECT id FROM users WHERE id != ?1)`)
    .bind(creator.id)
    .all<AvailabilityRow>()
  const availByUser = new Map<string, AvailabilityRow[]>()
  for (const a of availRes.results ?? []) {
    const arr = availByUser.get(a.user_id) ?? []
    arr.push(a)
    availByUser.set(a.user_id, arr)
  }

  const creatorOffset = creator.timezone ? tzOffsetMinutes(creator.timezone, scheduled_at) : 0

  const matches: Candidate[] = []
  for (const u of users) {
    if (!u.timezone) continue
    const slots = availByUser.get(u.id)
    if (!slots || slots.length === 0) continue

    const localStart = utcToLocal(scheduled_at, u.timezone)
    const localEnd = utcToLocal(endAt, u.timezone)

    // The session must fit within one window that day (we don't span days).
    if (localStart.dow !== localEnd.dow) continue

    const fits = slots.some(
      s =>
        s.day_of_week === localStart.dow &&
        s.start_minute <= localStart.minute &&
        s.end_minute >= localEnd.minute
    )
    if (!fits) continue

    const sameLength = u.preferred_length === length_minutes ? 0 : 1
    const tzDiff = Math.abs(tzOffsetMinutes(u.timezone, scheduled_at) - creatorOffset)
    const rank = sameLength * 10_000 + tzDiff

    matches.push({
      user_id: u.id,
      name: u.name,
      timezone: u.timezone,
      preferred_length: u.preferred_length,
      rank,
    })
  }

  matches.sort((a, b) => a.rank - b.rank)
  return matches.slice(0, limit)
}
