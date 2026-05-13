import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

initOpenNextCloudflareForDev()

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
}

export default nextConfig
