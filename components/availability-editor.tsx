'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatTimeOfDay, parseTimeOfDay } from '@/lib/utils'
import { t } from '@/lib/czech'

interface DaySlot {
  enabled: boolean
  start: string
  end: string
}

interface ApiSlot {
  day_of_week: number
  start_minute: number
  end_minute: number
}

const DEFAULT_START = '06:00'
const DEFAULT_END = '22:00'

export function AvailabilityEditor({ initial }: { initial: ApiSlot[] }) {
  const [days, setDays] = useState<DaySlot[]>(() => {
    const out: DaySlot[] = Array.from({ length: 7 }, () => ({
      enabled: false,
      start: DEFAULT_START,
      end: DEFAULT_END,
    }))
    for (const s of initial) {
      out[s.day_of_week] = {
        enabled: true,
        start: formatTimeOfDay(s.start_minute),
        end: formatTimeOfDay(s.end_minute),
      }
    }
    return out
  })
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    if (savedNote) {
      const tid = setTimeout(() => setSavedNote(false), 2000)
      return () => clearTimeout(tid)
    }
  }, [savedNote])

  function update(i: number, patch: Partial<DaySlot>) {
    setDays(prev => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  async function onSave() {
    setSaving(true)
    const slots: ApiSlot[] = []
    for (let i = 0; i < days.length; i++) {
      const d = days[i]
      if (!d.enabled) continue
      const start = parseTimeOfDay(d.start)
      const end = parseTimeOfDay(d.end)
      if (start === null || end === null || end <= start) continue
      slots.push({ day_of_week: i, start_minute: start, end_minute: end })
    }
    try {
      await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      })
      setSavedNote(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-klid-muted">{t.availabilityHint}</p>
      <ul className="divide-y divide-klid-line rounded-md border border-klid-line bg-white">
        {days.map((d, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 text-sm font-medium text-klid-ink">{t.days[i]}</div>
            <Switch
              checked={d.enabled}
              onCheckedChange={enabled => update(i, { enabled })}
              aria-label={t.daysLong[i]}
            />
            <div className="flex flex-1 items-center gap-2">
              <Input
                type="time"
                value={d.start}
                onChange={e => update(i, { start: e.target.value })}
                disabled={!d.enabled}
                className="h-9 max-w-[7.5rem]"
              />
              <span className="text-klid-muted">–</span>
              <Input
                type="time"
                value={d.end}
                onChange={e => update(i, { end: e.target.value })}
                disabled={!d.enabled}
                className="h-9 max-w-[7.5rem]"
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={saving}>
          {saving ? t.loading : t.save}
        </Button>
        {savedNote && <span className="text-sm text-klid-green">{t.saved}</span>}
      </div>
    </div>
  )
}
