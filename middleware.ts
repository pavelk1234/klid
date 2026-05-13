import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'klid_session'

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/schedule', '/session', '/settings']
const AUTH_REDIRECT_TARGETS = ['/auth']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isAuthPage(pathname: string): boolean {
  return AUTH_REDIRECT_TARGETS.some(p => pathname === p)
}

async function verify(token: string, secret: string): Promise<string | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.JWT_SECRET ?? ''

  const userId = token && secret ? await verify(token, secret) : null

  if (isProtected(pathname) && !userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage(pathname) && userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - Next internals (_next/static, _next/image)
     * - Static files (favicon, manifest, icons, sounds)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg|icon-.*|sounds/.*).*)',
  ],
}
