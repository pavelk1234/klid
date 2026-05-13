import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getEnv } from './db'

const COOKIE_NAME = 'klid_session'
const JWT_ALG = 'HS256'
const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 30 // 30 days

function secret(): Uint8Array {
  const s = getEnv().JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(s)
}

// Works in middleware (no getRequestContext) by accepting the secret explicitly.
export function secretFromString(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export async function signSessionJWT(userId: string): Promise<string> {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(secret())
}

export async function verifySessionJWT(token: string, key?: Uint8Array): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key ?? secret(), { algorithms: [JWT_ALG] })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jwt = await signSessionJWT(userId)
  const store = await cookies()
  store.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: JWT_EXPIRY_SECONDS,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies()
  const c = store.get(COOKIE_NAME)
  if (!c) return null
  return await verifySessionJWT(c.value)
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
