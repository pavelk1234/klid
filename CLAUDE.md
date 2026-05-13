# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Klid** (Czech for "peace/calm") — a minimal PWA that pairs two strangers for a scheduled silent meditation sit over video. The product is two humans + a timer + a camera. Everything else is explicitly out of scope.

Original spec called for Next.js + Supabase + Daily.co + Resend on Cloudflare Pages. Pavel asked for the lightest possible thing to build and maintain. We dropped Supabase (replaced with Cloudflare D1 + custom magic-link auth) and Daily.co (replaced with Jitsi Meet iframe — no API key, no signup, free).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 App Router (TypeScript) on edge runtime |
| Styling | Tailwind + shadcn/ui primitives (only `button`, `input`, `label`, `card`, `select`, `switch` — keep it small) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (SQLite) bound as `DB` |
| Auth | Custom magic link (Resend email + signed JWT in HttpOnly cookie via `jose`) — no Supabase |
| Video | Jitsi Meet embedded iframe at `https://meet.jit.si/klid-{sessionId}` — no API key needed |
| Email | Resend (transactional) |
| Cron | Cloudflare Cron Triggers — separate worker at `workers/reminder-cron.ts` |
| PWA | `public/manifest.json` + `public/sw.js` + `public/icon.svg` |

Three accounts total: Cloudflare, Resend, Jitsi (zero setup).

## Project layout

```
app/
  layout.tsx              # <html lang="cs">, manifest, service-worker registration
  page.tsx                # Landing
  auth/                   # Magic link entry + callback (token verification)
  onboarding/             # First-time name/tz/length/frequency
  dashboard/              # Upcoming + past sessions, "Naplánovat" button
  schedule/               # Pick date/time/length → candidates → confirm
  session/[id]/           # Jitsi iframe + Timer state machine
  settings/               # Edit prefs, halfway-bell toggle, availability editor
  api/                    # All routes: export const runtime = 'edge'
    auth/                 # send-link, signout
    me/                   # GET/PATCH user
    availability/         # PUT weekly availability
    sessions/             # POST create, GET list; [id]/{match,complete,DELETE}
    candidates/           # GET candidates for a slot
components/
  ui/                     # shadcn primitives
  timer.tsx               # Meditation timer state machine + bell audio + wake lock
  jitsi-frame.tsx         # iframe wrapper
  session-room.tsx        # Composes Timer + JitsiFrame
  schedule-form.tsx       # Date/time/length picker + candidate selection
  availability-editor.tsx # 7-day grid with start/end time per day
  settings-form.tsx, onboarding-form.tsx, auth-form.tsx, session-list.tsx, nav.tsx
lib/
  czech.ts                # ALL UI strings + email subject/body builders. Single source of truth.
  db.ts                   # D1 helpers (getDB, getEnv, typed row interfaces, query functions)
  auth.ts                 # JWT sign/verify, cookie helpers (cookies() is async in Next 15)
  email.ts                # Resend client wrappers (sendMagicLink, sendReminder15m, etc.)
  jitsi.ts                # Room name generator + URL with audio-muted/video-on config
  matching.ts             # Availability overlap algorithm + ranking
  utils.ts                # cn, uuid, randomHex, tz helpers, time-of-day parsing, formatMmSs
workers/
  reminder-cron.ts        # Separate Cloudflare Worker, runs every 5 min
migrations/
  0001_initial.sql        # users, sessions, availability, auth_tokens + indexes
public/
  manifest.json, sw.js, icon.svg, sounds/tibetan-bowl.mp3 (Pavel to drop in)
middleware.ts             # Reads klid_session cookie, redirects unauth from protected routes
wrangler.toml             # Main app (Workers + D1)
wrangler.cron.toml        # Cron worker (separate deployment, same D1)
open-next.config.ts       # OpenNext defaults
next.config.mjs           # initOpenNextCloudflareForDev + outputFileTracingRoot
```

## Database schema (D1 / SQLite)

See `migrations/0001_initial.sql` for the canonical version. Four tables:

- **users** — `id, email, name, timezone (IANA), preferred_length (10|20|30|45|60), preferred_frequency (daily|3x|2x|1x), halfway_bell (0|1), created_at`
- **sessions** — `id, scheduled_at (unix ms UTC), length_minutes, creator_id, partner_id (nullable), status (open|matched|completed|cancelled), jitsi_room, reminder_15m_sent_at, reminder_24h_sent_at, thanks_sent_at, created_at`
- **availability** — `id, user_id, day_of_week (0-6, Sun-Sat), start_minute, end_minute` (minutes from midnight in user's local TZ)
- **auth_tokens** — `token (32-byte hex), email, expires_at (15 min), used`

**Schema deviation from spec**: spec used Postgres `time` type for availability; D1/SQLite has none, so we store minutes from midnight as integers.

## Czech-only — no i18n library

All UI copy lives in `lib/czech.ts` as a `t` const map. Every component imports from there. No `next-intl`, no English fallback. Adding a second language would be a real rewrite — don't suggest it casually.

## How the moving parts talk

**Auth**
- `POST /api/auth/send-link` writes a one-time token to `auth_tokens`, emails the magic link
- `/auth/callback?token=...` (server component) validates, upserts user, sets `klid_session` HttpOnly JWT cookie, redirects to `/onboarding` (if `user.name` is null) or `/dashboard`
- `middleware.ts` enforces auth on `/dashboard`, `/onboarding`, `/schedule`, `/session`, `/settings`
- Dev mode: if Resend isn't configured, the magic link is logged to the dev server terminal — click it from there

**Scheduling + matching**
- `POST /api/sessions` creates an `open` session with a Jitsi room name (`klid-{uuid}`)
- `GET /api/candidates?scheduled_at=&length_minutes=` returns up to 5 ranked candidates
- Ranking in `lib/matching.ts`: same `preferred_length` wins first, then smaller absolute timezone-offset diff
- `POST /api/sessions/:id/match` either sets a specific `partner_id` (status `matched`) or leaves it `open` for the cron's auto-match (the "Kdokoliv" flow)

**Session room (`/session/[id]`)**
- Renders `<JitsiFrame>` + `<Timer>` via `<SessionRoom>`
- Timer state machine: `greeting (30s) → running → chat (2 min) → done`
- Bell plays at end (always) and at halfway (if user's `halfway_bell = 1`)
- "Konec" requires double-tap within 1s to end early
- Screen wake lock via `navigator.wakeLock` (gracefully degrades)
- If session is `open` and unassigned, visiting `/session/[id]` claims it for the visitor (auto-match on visit)
- `POST /api/sessions/:id/complete` marks the session done; cron handles the thank-you email

**Reminder cron (`workers/reminder-cron.ts`)**
- Separate Cloudflare Worker, NOT part of the Next.js app
- Cron `*/5 * * * *` (every 5 min)
- Sends 15-min reminders, 24h confirmations, thank-yous
- Auto-matches "Kdokoliv" sessions at T-60min, or cancels them if no candidate is available

## Common dev commands

```bash
npm install                                          # one-time
npm run dev                                          # next dev (D1 bindings available via OpenNext local platform)
npm run build                                        # type-check + production build (verify before commit)
npm run lint                                         # next lint (eslint-config-next)
npm run cf:build                                     # build for Cloudflare (writes to .open-next/)
npm run cf:preview                                   # local preview against the built artifact
npm run cf:deploy                                    # deploy main app

# D1
npm run d1:create                                    # creates the remote DB (one-time)
npm run d1:migrate:local                             # apply schema to local D1
npm run d1:migrate:remote                            # apply schema to remote D1

# Cron worker (separate deploy)
npm run cron:dev                                     # run reminder-cron locally with --test-scheduled
npx wrangler deploy --config wrangler.cron.toml
npx wrangler cron trigger klid-reminder-cron --config wrangler.cron.toml   # force-fire

# Live logs
npx wrangler tail
npx wrangler tail --config wrangler.cron.toml
```

No test framework is configured — there is no `npm test`. Verify changes with `npm run build` + `npm run lint`, then manual smoke-test the affected flow.

## Required env / secrets

`.env.local` (dev only):
```
JWT_SECRET=<openssl rand -base64 32>
RESEND_API_KEY=re_xxx
EMAIL_FROM=Klid <onboarding@resend.dev>     # or your verified domain
NEXT_PUBLIC_APP_URL=http://localhost:3000   # production: the live URL
```

In production, secrets are set on Cloudflare via `wrangler secret put` (see DEPLOY.md). Vars in `wrangler.toml` / `wrangler.cron.toml` cover the non-secret ones.

## Deployment

Two options, both documented in `DEPLOY.md`:
- **Option A** — Cloudflare Workers Builds (Cloudflare connects directly to GitHub, builds in their infra)
- **Option B** — GitHub Actions (workflow at `.github/workflows/deploy.yml`)

Both deploy two workers: the main app (`klid`) and the reminder cron (`klid-reminder-cron`).

## What is intentionally NOT here

Do not add any of these without an explicit ask from Pavel:
- User profiles beyond name + preferences
- Profile pictures or any user-uploaded images
- Text chat or messaging
- Social feed, activity feed
- Reviews, ratings, feedback forms
- Streaks, statistics, gamification
- Friends list, follow system
- Public schedules or directories
- Group sessions (>2 people)
- Meditation tradition picker, guided audio, music
- Push notifications beyond email
- Native mobile apps
- Payments, premium tier
- A second language

The product principle Pavel set: sign in, set when you're free, get matched, do the sit, leave.

## Build gotchas we hit

- **Next 14 doesn't ship 14.3+ in the registry**, but `@cloudflare/next-on-pages` requires Next 14.3+. The Cloudflare-recommended path is now `@opennextjs/cloudflare` (their old `next-on-pages` adapter is deprecated). We use Next 15.5.18 + OpenNext.
- **Next 15 made dynamic route params async**. All `[id]` route handlers and page components destructure `{ id }` from `await params`. Similarly `searchParams` and `cookies()`.
- **D1 bindings in code**: use `getCloudflareContext().env.DB` from `@opennextjs/cloudflare` (in `lib/db.ts`). Old `@cloudflare/next-on-pages` used `getRequestContext` — don't carry that pattern forward.
- **The cron worker is its own deploy** with its own `wrangler.cron.toml`. Both wranglers reference the same D1 `database_id` — when you rotate or rename the DB, update both files.
- **Jitsi public server** (`meet.jit.si`) is free and works zero-config. The room name `klid-{uuid}` is unguessable, so privacy comes from URL secrecy. If we ever need real privacy, self-host Jitsi or move to a paid SFU.
- **Wake lock** isn't supported in older Safari/Firefox — `navigator.wakeLock?.request('screen')` already feature-detects and degrades silently.
- **Bell audio**: `public/sounds/tibetan-bowl.mp3` doesn't exist yet (Pavel will drop one in). The Timer wraps `audio.play()` in try/catch, so missing audio file = silent end, no crash.

## When updating this file

- New table or column → update "Database schema"
- New page or API route → update "Project layout"
- New environment variable → update "Required env / secrets"
- Architecture pivot (e.g., switching email provider, swapping Jitsi) → update "Stack" + relevant section
- New "do not build" → update "What is intentionally NOT here"
- New build gotcha → add to "Build gotchas"
