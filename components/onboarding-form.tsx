'use client'

import { useEffect, useState } from 'react'
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
import { detectTimezone } from '@/lib/utils'
import { frequencies, sessionLengths, t, type Frequency, type SessionLength } from '@/lib/czech'

interface Props {
  initial: {
    name?: string | null
    timezone?: string | null
    preferred_length?: number | null
    preferred_frequency?: string | null
  }
}

export function OnboardingForm({ initial }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial.name ?? '')
  const [tz, setTz] = useState(initial.timezone ?? '')
  const [length, setLength] = useState<SessionLength>(
    (initial.preferred_length as SessionLength) ?? 20
  )
  const [frequency, setFrequency] = useState<Frequency>(
    (initial.preferred_frequency as Frequency) ?? 'daily'
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tz) setTz(detectTimezone())
  }, [tz])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          timezone: tz.trim(),
          preferred_length: length,
          preferred_frequency: frequency,
        }),
      })
      if (!res.ok) throw new Error()
      router.push('/dashboard')
      router.refresh()
    } catch {
      setErr(t.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t.yourName}</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Honza"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tz">{t.timezone}</Label>
        <Input
          id="tz"
          required
          value={tz}
          onChange={e => setTz(e.target.value)}
          placeholder="Europe/Prague"
        />
        <p className="text-xs text-klid-muted">IANA, např. Europe/Prague nebo America/New_York.</p>
      </div>

      <div className="space-y-2">
        <Label>{t.sessionLength}</Label>
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

      <div className="space-y-2">
        <Label>{t.frequency}</Label>
        <Select value={frequency} onValueChange={v => setFrequency(v as Frequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frequencies.map(f => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving ? t.loading : t.save}
      </Button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  )
}
