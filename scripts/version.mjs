import { execSync } from 'node:child_process'

/**
 * The single source of the build identity, shared by the bundle (baked in via
 * vite `define`) and by the published OTA manifest.
 *
 * These two MUST agree: the installed app compares its own baked version with
 * the manifest's, so a mismatch would make every launch believe an update is
 * waiting and re-download it forever.
 *
 * Commit count is monotonic, needs no bookkeeping, and gives the same answer
 * locally and in CI — as long as the checkout is not shallow (the deploy
 * workflow sets fetch-depth: 0 for exactly this reason).
 */
export function buildVersion() {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim()
    if (/^\d+$/.test(count)) return `1.0.${count}`
  } catch {
    /* no git available — fall through */
  }
  return '1.0.0'
}
