// Jitsi Meet integration — we use the public meet.jit.si server.
// Room names are unguessable (derived from session id) so privacy comes from URL secrecy.

export function jitsiRoomName(sessionId: string): string {
  return `klid-${sessionId}`
}

export function jitsiUrl(sessionId: string, displayName?: string): string {
  const room = jitsiRoomName(sessionId)
  const config = [
    'config.startWithAudioMuted=true',
    'config.startWithVideoMuted=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    'config.disableInviteFunctions=true',
    'config.toolbarButtons=["microphone","camera","hangup"]',
  ]
  const userInfo = displayName
    ? `&userInfo.displayName=${encodeURIComponent(displayName)}`
    : ''
  return `https://meet.jit.si/${room}#${config.join('&')}${userInfo}`
}
