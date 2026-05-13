'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatMmSs } from '@/lib/utils'
import { t } from '@/lib/czech'

type Phase = 'greeting' | 'running' | 'chat' | 'done'

interface Props {
  lengthMinutes: number
  halfwayBell: boolean
  greetingSeconds?: number
  chatSeconds?: number
  onComplete: () => void
}

const BELL_SRC = '/sounds/tibetan-bowl.mp3'
const KEEP_AWAKE_TICK_MS = 50

export function Timer({
  lengthMinutes,
  halfwayBell,
  greetingSeconds = 30,
  chatSeconds = 120,
  onComplete,
}: Props) {
  const totalMs = lengthMinutes * 60_000
  const halfwayMs = Math.floor(totalMs / 2)

  const [phase, setPhase] = useState<Phase>('greeting')
  const [remainingMs, setRemainingMs] = useState<number>(greetingSeconds * 1000)
  const [endTapState, setEndTapState] = useState<'idle' | 'confirming'>('idle')

  const phaseStartMs = useRef<number | null>(null)
  const halfwayFired = useRef(false)
  const bellRef = useRef<HTMLAudioElement | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const completedRef = useRef(false)

  // Preload bell sound on mount
  useEffect(() => {
    if (typeof Audio === 'undefined') return
    const a = new Audio(BELL_SRC)
    a.preload = 'auto'
    bellRef.current = a
    return () => {
      try { a.pause() } catch {}
      bellRef.current = null
    }
  }, [])

  function playBell() {
    const a = bellRef.current
    if (!a) return
    try {
      a.currentTime = 0
      void a.play()
    } catch {}
  }

  async function requestWakeLock() {
    try {
      const lock = await navigator.wakeLock?.request('screen')
      if (lock) wakeLockRef.current = lock
    } catch {}
  }
  async function releaseWakeLock() {
    try { await wakeLockRef.current?.release() } catch {}
    wakeLockRef.current = null
  }

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && phase === 'running') {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  // Single rAF loop driving all phases
  useEffect(() => {
    let raf = 0
    let lastTick = 0
    phaseStartMs.current = performance.now()
    halfwayFired.current = false

    const initialRemaining =
      phase === 'greeting'
        ? greetingSeconds * 1000
        : phase === 'running'
        ? totalMs
        : phase === 'chat'
        ? chatSeconds * 1000
        : 0

    setRemainingMs(initialRemaining)

    if (phase === 'running') void requestWakeLock()

    function tick(now: number) {
      if (phaseStartMs.current === null) {
        phaseStartMs.current = now
      }
      const elapsed = now - phaseStartMs.current
      const remaining = Math.max(0, initialRemaining - elapsed)
      if (now - lastTick > KEEP_AWAKE_TICK_MS) {
        setRemainingMs(remaining)
        lastTick = now
      }

      if (phase === 'running' && halfwayBell && !halfwayFired.current && elapsed >= halfwayMs) {
        halfwayFired.current = true
        playBell()
      }

      if (remaining <= 0) {
        if (phase === 'greeting') {
          // Auto-advance only if the user clicked Start — handled by setPhase elsewhere.
          // Greeting just counts down and waits for user.
          setRemainingMs(0)
          return
        }
        if (phase === 'running') {
          playBell()
          void releaseWakeLock()
          setPhase('chat')
          return
        }
        if (phase === 'chat') {
          if (!completedRef.current) {
            completedRef.current = true
            onComplete()
          }
          setPhase('done')
          return
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Release wake lock on unmount
  useEffect(() => {
    return () => {
      void releaseWakeLock()
    }
  }, [])

  function onStart() {
    setPhase('running')
  }

  function onEndTap() {
    if (endTapState === 'idle') {
      setEndTapState('confirming')
      setTimeout(() => setEndTapState('idle'), 1000)
      return
    }
    // Confirmed — end the sit immediately, play bell, skip to chat.
    playBell()
    void releaseWakeLock()
    setPhase('chat')
    setEndTapState('idle')
  }

  function onLeave() {
    if (!completedRef.current) {
      completedRef.current = true
      onComplete()
    }
    setPhase('done')
  }

  // --- Render per phase ---

  if (phase === 'greeting') {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-klid-muted">{t.greeting}</div>
        <div className="timer-digits text-7xl font-light text-klid-ink">
          {formatMmSs(remainingMs)}
        </div>
        <Button size="lg" onClick={onStart}>
          {t.start}
        </Button>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="timer-digits text-8xl font-light text-klid-ink">
          {formatMmSs(remainingMs)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEndTap}
          className={endTapState === 'confirming' ? 'text-red-600' : 'text-klid-muted'}
        >
          {endTapState === 'confirming' ? t.endConfirm : t.end}
        </Button>
      </div>
    )
  }

  if (phase === 'chat') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-2xl font-semibold text-klid-ink">{t.sessionComplete}</div>
        <p className="max-w-md text-center text-klid-muted">{t.chatPrompt}</p>
        <div className="timer-digits text-3xl font-light text-klid-muted">
          {formatMmSs(remainingMs)}
        </div>
        <Button variant="outline" onClick={onLeave}>
          {t.leave}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-2xl font-semibold text-klid-ink">{t.thankYou}</div>
      <a href="/dashboard" className="text-klid-green underline-offset-4 hover:underline">
        {t.dashboard}
      </a>
    </div>
  )
}
