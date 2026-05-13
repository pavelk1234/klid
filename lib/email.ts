import { t } from './czech'

interface SendArgs {
  to: string
  subject: string
  text: string
  apiKey: string
  from: string
}

async function sendViaResend({ to, subject, text, apiKey, from }: SendArgs): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend send failed: ${res.status} ${body}`)
  }
}

interface EmailCtx {
  apiKey: string
  from: string
  appUrl: string
}

export async function sendMagicLink(ctx: EmailCtx, to: string, token: string): Promise<void> {
  const url = `${ctx.appUrl}/auth/callback?token=${encodeURIComponent(token)}`
  await sendViaResend({
    to,
    subject: t.emailMagicLinkSubject,
    text: t.emailMagicLinkBody(url),
    apiKey: ctx.apiKey,
    from: ctx.from,
  })
}

export async function sendReminder15m(ctx: EmailCtx, to: string, sessionId: string): Promise<void> {
  const url = `${ctx.appUrl}/session/${sessionId}`
  await sendViaResend({
    to,
    subject: t.emailReminderSubject,
    text: t.emailReminderBody(url),
    apiKey: ctx.apiKey,
    from: ctx.from,
  })
}

export async function sendConfirmation24h(
  ctx: EmailCtx,
  to: string,
  sessionId: string,
  whenLocal: string
): Promise<void> {
  const url = `${ctx.appUrl}/session/${sessionId}`
  await sendViaResend({
    to,
    subject: t.emailConfirmationSubject,
    text: t.emailConfirmationBody(whenLocal, url),
    apiKey: ctx.apiKey,
    from: ctx.from,
  })
}

export async function sendThanks(ctx: EmailCtx, to: string): Promise<void> {
  await sendViaResend({
    to,
    subject: t.emailThanksSubject,
    text: t.emailThanksBody,
    apiKey: ctx.apiKey,
    from: ctx.from,
  })
}

export async function sendMatched(
  ctx: EmailCtx,
  to: string,
  sessionId: string,
  whenLocal: string
): Promise<void> {
  const url = `${ctx.appUrl}/session/${sessionId}`
  await sendViaResend({
    to,
    subject: t.emailMatchedSubject,
    text: t.emailMatchedBody(whenLocal, url),
    apiKey: ctx.apiKey,
    from: ctx.from,
  })
}

export async function sendCancelled(ctx: EmailCtx, to: string): Promise<void> {
  await sendViaResend({
    to,
    subject: t.emailCancelledSubject,
    text: t.emailCancelledBody,
    apiKey: ctx.apiKey,
    from: ctx.from,
  })
}
