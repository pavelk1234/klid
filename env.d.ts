// Cloudflare bindings exposed via @cloudflare/next-on-pages
// `getRequestContext().env` returns this shape.

interface CloudflareEnv {
  DB: D1Database
  JWT_SECRET: string
  RESEND_API_KEY: string
  EMAIL_FROM: string
  NEXT_PUBLIC_APP_URL: string
}
