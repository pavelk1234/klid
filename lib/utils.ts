import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uuid(): string {
  return crypto.randomUUID()
}

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export function nowMs(): number {
  return Date.now()
}

// Returns offset in minutes east of UTC for a given IANA zone at a given instant.
// Europe/Prague in summer → 120, in winter → 60.
export function tzOffsetMinutes(timezone: string, atMs: number = Date.now()): number {
  const date = new Date(atMs)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const lookup: Record<string, number> = {}
  for (const p of parts) if (p.type !== 'literal') lookup[p.type] = parseInt(p.value, 10)
  const asUTC = Date.UTC(
    lookup.year,
    lookup.month - 1,
    lookup.day,
    lookup.hour,
    lookup.minute,
    lookup.second
  )
  return Math.round((asUTC - date.getTime()) / 60000)
}

// Convert UTC instant → { day_of_week, minute_of_day } in the given timezone.
export function utcToLocal(atMs: number, timezone: string): { dow: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(atMs))
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  let dow = 0, h = 0, m = 0
  for (const p of parts) {
    if (p.type === 'weekday') dow = weekdayMap[p.value] ?? 0
    if (p.type === 'hour') h = parseInt(p.value, 10)
    if (p.type === 'minute') m = parseInt(p.value, 10)
  }
  return { dow, minute: h * 60 + m }
}

export function formatLocal(
  atMs: number,
  timezone: string,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...opts,
  }).format(new Date(atMs))
}

export function formatTimeOfDay(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  const m = minutesFromMidnight % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function parseTimeOfDay(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null
  return h * 60 + mm
}

// Best-effort detection of the browser's IANA timezone. Used to pre-fill onboarding.
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Prague'
  } catch {
    return 'Europe/Prague'
  }
}

// Format milliseconds → "MM:SS" for the meditation timer.
export function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
