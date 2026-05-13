'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { frequencies, sessionLengths, t, type Frequency, type SessionLength } from '@/lib/czech'

interface Props {
  initial: {
    name: string
    timezone: string
    preferred_length: number
    preferred_frequency: string
    halfway_bell: boolean
  }
}

export function SettingsForm({ initial }: Props) {
  const [name, setName] = useState(initial.name)
  const [tz, setTz] = useState(initial.timezone)
  const [length, setLength] = useState<SessionLength>(initial.preferred_length as SessionLength)
  const [frequency, setFrequency] = useState<Frequency>(initial.preferred_frequency as Frequency)
  const [halfwayBell, setHalfwayBell] = useState(initial.halfway_bell)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          timezone: tz.trim(),
          preferred_length: length,
          preferred_frequency: frequency,
          halfway_bell: halfwayBell,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t.yourName}</Label>
        <Input id="name" required value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tz">{t.timezone}</Label>
        <Input id="tz" required value={tz} onChange={e => setTz(e.target.value)} />
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

      <div className="flex items-start justify-between gap-4 rounded-md border border-klid-line p-4">
        <div>
          <div className="font-medium text-klid-ink">{t.halfwayBell}</div>
          <div className="text-sm text-klid-muted">{t.halfwayBellHint}</div>
        </div>
        <Switch checked={halfwayBell} onCheckedChange={setHalfwayBell} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? t.loading : t.save}
        </Button>
        {saved && <span className="text-sm text-klid-green">{t.saved}</span>}
      </div>
    </form>
  )
}
