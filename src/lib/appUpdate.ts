import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { Network } from '@capacitor/network'

/**
 * Silent over-the-air content updates for the installed Android app.
 *
 * The rules this file exists to guarantee, in order of importance:
 *
 *  1. **Never block the app.** Nothing here is awaited by boot. Offline, slow
 *     network, a 404, a corrupt manifest — all of it fails silently and the app
 *     keeps running from whatever bundle is already installed.
 *  2. **Never leave a broken bundle installed.** `notifyAppReady()` is called
 *     only after React has actually painted. If an update ever ships a bundle
 *     that cannot boot, it never reports ready and Android reverts to the last
 *     good one (see `appReadyTimeout` in capacitor.config.ts).
 *  3. **Never surprise the child.** A downloaded update is staged with
 *     `next()`, so it takes effect on the following cold start rather than
 *     reloading the screen mid-story.
 *
 * The APK ships with every story bundled, so none of this is needed to read a
 * story — it only keeps the app's code and content current.
 */

export const APP_VERSION = __APP_VERSION__

const MANIFEST_URL = `${__OTA_ORIGIN__}/ota/latest.json`
const MANIFEST_TIMEOUT_MS = 8000

/** Entry shape the native plugin expects for per-file delta downloads. */
type ManifestEntry = {
  file_name: string
  file_hash: string
  download_url: string
}

type LatestManifest = {
  version: string
  manifest: ManifestEntry[]
}

const isNative = () => Capacitor.isNativePlatform()

/**
 * Marks the running bundle as healthy. Must run after the UI is on screen —
 * calling it earlier would certify a bundle that might still crash on render,
 * defeating the automatic rollback.
 */
export async function markAppHealthy(): Promise<void> {
  if (!isNative()) return
  try {
    await CapacitorUpdater.notifyAppReady()
  } catch {
    /* plugin missing or already notified — nothing to recover from */
  }
}

async function fetchManifest(): Promise<LatestManifest | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<LatestManifest>
    if (typeof data.version !== 'string' || !Array.isArray(data.manifest)) return null
    if (!data.manifest.length) return null
    return { version: data.version, manifest: data.manifest as ManifestEntry[] }
  } catch {
    // Offline, DNS failure, timeout, malformed JSON — all the same to us.
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The first update after installing an APK has no previously downloaded files
 * to reuse, so it re-fetches every story asset (tens of MB). Later updates are
 * true deltas — only the changed files. Holding downloads to Wi-Fi keeps that
 * first one off a parent's mobile data.
 */
async function onWifi(): Promise<boolean> {
  try {
    const status = await Network.getStatus()
    return status.connected && status.connectionType === 'wifi'
  } catch {
    // Without a definite answer, assume metered and wait for a better moment.
    return false
  }
}

/**
 * Checks for a newer bundle and stages it for the next launch. Safe to call
 * unconditionally: it returns immediately on the web, where the service worker
 * already handles updates.
 */
export async function checkForUpdate(): Promise<void> {
  if (!isNative()) return

  try {
    const current = await CapacitorUpdater.current()
    const latest = await fetchManifest()
    if (!latest) return
    if (latest.version === current.bundle.version) return

    // Don't re-download something already staged from an earlier launch.
    const existing = await CapacitorUpdater.list().catch(() => ({ bundles: [] }))
    const staged = existing.bundles.find(
      (b) => b.version === latest.version && b.status !== 'error',
    )
    if (staged) {
      await CapacitorUpdater.next({ id: staged.id })
      return
    }

    if (!(await onWifi())) return

    const bundle = await CapacitorUpdater.download({
      // With a manifest the plugin fetches each file from its own
      // download_url; this stays set because the API requires it.
      url: MANIFEST_URL,
      version: latest.version,
      manifest: latest.manifest,
    })
    await CapacitorUpdater.next({ id: bundle.id })
  } catch {
    /* a failed update must look exactly like no update at all */
  }
}

/**
 * Runs the update check once the app is idle, so it never competes with the
 * first render or the first story's audio.
 */
export function scheduleUpdateCheck(): void {
  if (!isNative()) return
  const run = () => void checkForUpdate()
  const idle = (window as Window & typeof globalThis).requestIdleCallback
  if (typeof idle === 'function') idle(run, { timeout: 5000 })
  else window.setTimeout(run, 3000)
}
