// Minimal service worker for Klid.
// Strategy: cache the app shell on install, network-first for HTML,
// cache-first for static assets. No offline session — video needs network.

const CACHE = 'klid-shell-v1'
const SHELL = ['/', '/auth', '/manifest.json', '/icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Never cache API responses or the Jitsi iframe.
  if (url.pathname.startsWith('/api/') || url.host.endsWith('jit.si')) return

  const isHTML = req.headers.get('accept')?.includes('text/html')
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then(m => m || caches.match('/')))
    )
    return
  }

  // Static asset — cache-first
  event.respondWith(
    caches.match(req).then(
      cached =>
        cached ||
        fetch(req).then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
          return res
        })
    )
  )
})
