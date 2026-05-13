'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sessionLengths, t, type SessionLength } from '@/lib/czech'

interface Candidate {
  user_id: string
  name: string | null
  timezone: string | null
  preferred_length: number | null
}

interface Props {
  userTimezone: string
  preferredLength: number
}

export function ScheduleForm({ userTimezone, preferredLength }: Props) {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [length, setLength] = useState<SessionLength>((preferredLength as SessionLength) ?? 20)
  const [step, setStep] = useState<'pick' | 'partner' | 'submitting'>('pick')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [err, setErr] = useState<string | null>(null)

  // Default to today + nearest 30-min slot.
  useEffect(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    setDate(`${yyyy}-${mm}-${dd}`)
    const minutes = Math.ceil(now.getMinutes() / 30) * 30 + 30
    const h = now.getHours() + Math.floor(minutes / 60)
    const m = minutes % 60
    setTime(`${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }, [])

  // Compute the UTC ms for the picked local date+time in the user's tz.
  function localToUtcMs(): number | null {
    if (!date || !time) return null
    // Build naive Date in local TZ — JS Date defaults to local browser tz, which we treat
    // as authoritative for scheduling. Users set their tz once and pick times in it.
    const [Y, M, D] = date.split('-').map(Number)
    const [h, m] = time.split(':').map(Number)
    if ([Y, M, D, h, m].some(n => !Number.isFinite(n))) return null
    return new Date(Y, M - 1, D, h, m, 0, 0).getTime()
  }

  async function onFindCandidates(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const ts = localToUtcMs()
    if (ts === null || ts < Date.now()) {
      setErr('Vyber budoucí čas.')
      return
    }
    const url = `/api/candidates?scheduled_at=${ts}&length_minutes=${length}`
    const res = await fetch(url)
    if (!res.ok) {
      setErr(t.error)
      return
    }
    const { candidates } = (await res.json()) as { candidates: Candidate[] }
    setCandidates(candidates)
    setStep('partner')
  }

  async function onConfirm(partnerId: string | null) {
    setStep('submitting')
    const ts = localToUtcMs()
    if (ts === null) return
    const created = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: ts, length_minutes: length }),
    })
    if (!created.ok) {
      setErr(t.error)
      setStep('partner')
      return
    }
    const { id } = (await created.json()) as { id: string }

    await fetch(`/api/sessions/${id}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        partnerId ? { mode: 'specific', partner_id: partnerId } : { mode: 'anyone' }
      ),
    })

    router.push('/dashboard')
    router.refresh()
  }

  if (step === 'partner') {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setStep('pick')}
          className="text-sm text-klid-green underline-offset-4 hover:underline"
        >
          ← {t.back}
        </button>
        <h2 className="text-xl font-semibold text-klid-ink">{t.pickPartner}</h2>
        {candidates.length === 0 ? (
          <p className="text-klid-muted">{t.noCandidates}</p>
        ) : (
          <ul className="space-y-2">
            {candidates.map(c => (
              <li
                key={c.user_id}
                className="flex items-center justify-between rounded-md border border-klid-line bg-white px-4 py-3"
              >
                <div>
                  <div className="text-klid-ink">{c.name ?? '—'}</div>
                  <div className="text-sm text-klid-muted">
                    {c.timezone} · {c.preferred_length} min
                  </div>
                </div>
                <Button onClick={() => onConfirm(c.user_id)} size="sm">
                  {t.confirm}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="rounded-md border border-klid-line bg-white p-4">
          <div className="mb-2 font-medium text-klid-ink">{t.anyone}</div>
          <p className="mb-3 text-sm text-klid-muted">
            Necháme sezení otevřené. Hodinu před začátkem spárujeme s kýmkoliv dostupným.
          </p>
          <Button variant="outline" onClick={() => onConfirm(null)}>
            {t.confirm}
          </Button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={onFindCandidates} className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date">{t.date}</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">{t.time}</Label>
          <Input
            id="time"
            type="time"
            step={1800}
            required
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.length}</Label>
        <Select value={String(length)} onValueChange={v => setLength(Number(v) as SessionLength)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sessionLengths.map(n => (
              <SelectItem key={n} value={String(n)}>
                {n} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-klid-muted">Tvoje pásmo: {userTimezone}</p>

      <Button type="submit" size="lg" className="w-full" disabled={step === 'submitting'}>
        {step === 'submitting' ? t.loading : t.scheduleSession}
      </Button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  )
}
