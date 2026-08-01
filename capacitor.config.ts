import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.attiazaghloul.storygarden',
  appName: 'Story Garden',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#fff9f2',
  },
  plugins: {
    CapacitorUpdater: {
      // Manual mode: updates are driven by src/lib/appUpdate.ts against our own
      // manifest on GitHub Pages, not by Capgo's hosted backend.
      autoUpdate: 'off',
      // A downloaded bundle only becomes active on the next cold start, so a
      // child is never yanked out of a story mid-page.
      directUpdate: false,
      // If a newly applied bundle fails to call notifyAppReady() within this
      // window, Android reverts to the last bundle that did. This is what makes
      // a broken update impossible to get stuck on.
      appReadyTimeout: 10000,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      // Installing a fresh APK discards older downloaded bundles, so the
      // native build is always the floor and never loses to a stale OTA.
      resetWhenUpdate: true,
    },
  },
}

export default config
