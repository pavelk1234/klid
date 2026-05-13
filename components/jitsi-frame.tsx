'use client'

import { jitsiUrl } from '@/lib/jitsi'

interface Props {
  sessionId: string
  displayName?: string
  className?: string
}

export function JitsiFrame({ sessionId, displayName, className }: Props) {
  return (
    <div className={className ?? 'aspect-video w-full overflow-hidden rounded-lg bg-black'}>
      <iframe
        src={jitsiUrl(sessionId, displayName)}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="h-full w-full border-0"
        title="Jitsi Meet"
      />
    </div>
  )
}
