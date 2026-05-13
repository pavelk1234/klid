# Klid

Meditace s ostatními. A minimal PWA for pairing two people for a silent meditation sit over video.

- Next.js 15 (App Router) on Cloudflare Workers via `@opennextjs/cloudflare`
- Cloudflare D1 (SQLite) + Cloudflare Cron Triggers
- Jitsi Meet for the video call (no API key needed)
- Resend for transactional email (magic link, reminders, thanks)
- PWA, installable on iOS and Android home screens

No Supabase. No Daily.co. Three accounts total: Cloudflare, Resend, Jitsi (zero setup).

## Local setup

```bash
# 1. Install deps
npm install

# 2. Create the D1 database
npx wrangler login
npx wrangler d1 create klid-dev
# Copy the printed database_id into wrangler.toml AND wrangler.cron.toml

# 3. Apply the schema
npm run d1:migrate:local

# 4. Add env vars
cp .env.local.example .env.local
# Edit .env.local: JWT_SECRET (random 32+ bytes), RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL

# 5. Run dev server
npm run dev
# Open http://localhost:3000
```

In dev mode, if Resend isn't configured, the magic-link URL is logged to the terminal — just click it.

## Project layout

```
app/             — Next.js routes (UI pages + API routes, all edge runtime)
components/      — React components, including shadcn primitives in components/ui
lib/             — db, auth, email, matching, jitsi helpers, Czech copy
workers/         — Cloudflare Cron Worker for reminders (separate deploy)
migrations/      — D1 schema migrations
public/          — manifest, service worker, icon, sounds
middleware.ts    — JWT cookie auth (protects /dashboard, /schedule, /session, /settings)
```

## How the pieces talk

- **Auth**: `POST /api/auth/send-link` writes a one-time token to `auth_tokens` and emails a link. `/auth/callback?token=…` verifies, upserts the user, sets a `klid_session` HttpOnly JWT cookie, and redirects.
- **Scheduling**: `POST /api/sessions` creates an `open` session with a Jitsi room name. `GET /api/candidates?scheduled_at=…&length_minutes=…` returns up to 5 ranked matches. `POST /api/sessions/:id/match` either assigns a specific partner (status `matched`) or leaves the session `open` for the cron to fill.
- **Session room**: `/session/:id` renders the Jitsi iframe + the meditation Timer. The Timer phases are `greeting (30s) → running → chat (2 min) → done`. End bell plays from `/sounds/tibetan-bowl.mp3`. Optional halfway bell from user settings. `POST /api/sessions/:id/complete` marks the session done.
- **Reminders**: `workers/reminder-cron.ts` runs every 5 minutes on a Cloudflare Cron Trigger. Sends 24h confirmations, 15-min reminders, thank-yous, and auto-matches any "kdokoliv" session at T-60min.

## What Pavel needs to drop in

1. **`public/sounds/tibetan-bowl.mp3`** — any CC0 sample, ~3 seconds, normalized to about −3 dB. Until this file exists, the Timer will run silently. The state machine ignores audio errors.
2. **Resend** — sign up at resend.com, verify a sender domain (or use `onboarding@resend.dev` for sandbox), put the API key in `.env.local` and as a Cloudflare secret (`wrangler pages secret put RESEND_API_KEY`).
3. **JWT secret** — `openssl rand -base64 32`, paste into `.env.local`, and `wrangler pages secret put JWT_SECRET`.
4. **Real icons** (optional) — the SVG at `public/icon.svg` works for the PWA install on modern browsers. For older iOS or Android variants, generate PNG fallbacks at 192×192 and 512×512 and update `public/manifest.json` and `app/layout.tsx`.
5. **Custom domain** — register `klid.app` or `klid.cz`, add it to Cloudflare Pages, set `NEXT_PUBLIC_APP_URL` to match.

## Deploying

See [DEPLOY.md](DEPLOY.md). Two options:
- **Option A** — Cloudflare Workers Builds (connect GitHub repo in Cloudflare dashboard, zero CI files)
- **Option B** — GitHub Actions (workflow at `.github/workflows/deploy.yml`, push to `main` to deploy)

Both deploy the main app (`klid`) and the reminder cron worker (`klid-reminder-cron`).

## What's intentionally not here

No profile pictures. No text chat. No reviews. No streaks. No friends list. No public schedule. No push notifications. No native apps. No group sessions. No tradition picker. No guided audio.

The app is: sign in, set when you're free, get matched, do the sit, leave.
