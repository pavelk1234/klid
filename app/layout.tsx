import type { Metadata, Viewport } from 'next'
import { t } from '@/lib/czech'
import './globals.css'

export const metadata: Metadata = {
  title: { default: `${t.appName} · ${t.tagline}`, template: `%s · ${t.appName}` },
  description: t.tagline,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: t.appName,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#7CB342',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}

function RegisterSW() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `,
      }}
    />
  )
}
