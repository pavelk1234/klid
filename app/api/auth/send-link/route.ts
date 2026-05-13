import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/db'
import { randomHex } from '@/lib/utils'
import { sendMagicLink } from '@/lib/email'

export const runtime = 'edge'

const TOKEN_TTL_MS = 15 * 60 * 1000

export async function POST(req: Request) {
  let email: string
  try {
    const body = (await req.json()) as { email?: string }
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const db = getDB()
  const env = getEnv()
  const token = randomHex(32)
  const expires = Date.now() + TOKEN_TTL_MS

  await db
    .prepare('INSERT INTO auth_tokens (token, email, expires_at, used) VALUES (?, ?, ?, 0)')
    .bind(token, email, expires)
    .run()

  try {
    await sendMagicLink(
      { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, appUrl: env.NEXT_PUBLIC_APP_URL },
      email,
      token
    )
  } catch (e) {
    // In dev, log the URL so you can click through without configuring Resend.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] magic link: ${env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${token}`)
      return NextResponse.json({ ok: true, dev_link_logged: true })
    }
    return NextResponse.json({ error: 'email_send_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
