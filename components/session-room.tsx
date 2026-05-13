'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JitsiFrame } from '@/components/jitsi-frame'
import { Timer } from '@/components/timer'

interface Props {
  sessionId: string
  lengthMinutes: number
  halfwayBell: boolean
  displayName: string
}

export function SessionRoom({ sessionId, lengthMinutes, halfwayBell, displayName }: Props) {
  const router = useRouter()
  const [completed, setCompleted] = useState(false)

  async function onComplete() {
    if (completed) return
    setCompleted(true)
    try {
      await fetch(`/api/sessions/${sessionId}/complete`, { method: 'POST' })
    } catch {}
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex justify-center">
        <Timer
          lengthMinutes={lengthMinutes}
          halfwayBell={halfwayBell}
          onComplete={onComplete}
        />
      </div>
      <JitsiFrame sessionId={sessionId} displayName={displayName} />
    </div>
  )
}
