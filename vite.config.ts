import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { buildVersion } from './scripts/version.mjs'

// Served from https://<user>.github.io/story-garden/ — override with
// BASE_PATH=/ when deploying to a domain root instead.
const BASE = process.env.BASE_PATH ?? '/story-garden/'

// Where the installed Android app looks for over-the-air content updates.
const OTA_ORIGIN = process.env.OTA_ORIGIN ?? 'https://attiazaghloul.github.io/story-garden'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion()),
    __OTA_ORIGIN__: JSON.stringify(OTA_ORIGIN.replace(/\/$/, '')),
  },
  plugins: [
    react(),
    VitePWA({
      // The Android build must not carry a service worker: inside the native
      // WebView it would cache the web bundle and fight the OTA updater for
      // control of which code runs. Capacitor gets its updates from
      // src/lib/appUpdate.ts instead.
      disable: process.env.CAPACITOR === 'true',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Story Garden',
        short_name: 'Story Garden',
        description:
          'Gentle educational stories for children ages 4–6, with expressive voices and tappable words.',
        lang: 'en',
        dir: 'ltr',
        id: BASE,
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#fff9f2',
        theme_color: '#db2777',
        categories: ['education', 'kids', 'books'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell (JS/CSS/HTML) is precached; the heavy media is cached the
        // first time a story is opened, so the install stays small.
        globPatterns: ['**/*.{js,css,html,svg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        // Without these a new deploy only shows up on the visit *after* next:
        // the old worker keeps serving its cached shell. Take over right away
        // and drop the previous precache.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/audio/words/manifest.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'story-word-manifest-v2',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/audio/') && !url.pathname.endsWith('/manifest.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-audio-v2',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/stories/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
