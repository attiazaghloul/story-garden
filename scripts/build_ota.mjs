/**
 * Publishes the over-the-air update payload for the installed Android app.
 *
 * The native shell always boots from the bundle inside the APK. This script
 * publishes a newer *content* bundle beside the website so the app can pick it
 * up silently — see src/lib/appUpdate.ts for the client half.
 *
 * Two things keep an update small:
 *
 *  - Story pictures and audio are byte-identical in the website build and the
 *    Android build, so the manifest points at the copies the website already
 *    serves. Only the handful of files that genuinely differ (the HTML and the
 *    hashed JS/CSS, a few hundred KB) get published under `ota/files/`.
 *  - Every entry carries its SHA-256. The native plugin downloads only the
 *    entries whose hash it does not already have, so a UI-only release moves
 *    the shell and nothing else.
 *
 * Usage: node scripts/build_ota.mjs <android-build-dir> <site-dir>
 */
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, posix, relative, sep } from 'node:path'
import { buildVersion } from './version.mjs'

const [, , androidDir, siteDir] = process.argv
if (!androidDir || !siteDir) {
  console.error('usage: node scripts/build_ota.mjs <android-build-dir> <site-dir>')
  process.exit(1)
}

const otaDir = join(siteDir, 'ota')
const filesDir = join(otaDir, 'files')

// Must match what the bundle was built with — see scripts/version.mjs.
const version = buildVersion()
const origin = (process.env.OTA_ORIGIN ?? 'https://attiazaghloul.github.io/story-garden').replace(
  /\/$/,
  '',
)

/**
 * A service worker is generated only for the website; it never belongs in a
 * bundle the native WebView runs. The published APK is a website download, not
 * app content.
 */
function isExcluded(relPath) {
  const name = posix.basename(relPath)
  return (
    name === 'sw.js' ||
    name === 'registerSW.js' ||
    name === 'StoryGarden.apk' ||
    /^workbox-[a-z0-9]+\.js$/.test(name)
  )
}

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

/** Hash every file the website publishes, keyed by its path within the site. */
const siteHashes = new Map()
for (const full of await walk(siteDir)) {
  const relPath = relative(siteDir, full).split(sep).join(posix.sep)
  siteHashes.set(relPath, sha256(await readFile(full)))
}

await mkdir(filesDir, { recursive: true })

const manifest = []
let totalBytes = 0
let publishedBytes = 0
let reusedCount = 0
const written = new Set()

for (const full of await walk(androidDir)) {
  const relPath = relative(androidDir, full).split(sep).join(posix.sep)
  if (isExcluded(relPath)) continue

  const buf = await readFile(full)
  const hash = sha256(buf)
  totalBytes += buf.length

  let downloadUrl
  if (siteHashes.get(relPath) === hash) {
    // Identical bytes are already on the site at this path — link to them
    // rather than publishing a second copy.
    downloadUrl = `${origin}/${relPath}`
    reusedCount += 1
  } else {
    downloadUrl = `${origin}/ota/files/${hash}`
    if (!written.has(hash)) {
      written.add(hash)
      await copyFile(full, join(filesDir, hash))
      publishedBytes += buf.length
    }
  }

  manifest.push({
    file_name: relPath,
    file_hash: hash,
    download_url: downloadUrl,
    // Ignored by the plugin; kept so a human can inspect the payload.
    size: buf.length,
  })
}

manifest.sort((a, b) => a.file_name.localeCompare(b.file_name))

const latest = {
  version,
  // Required by the plugin's download() signature. With a manifest present the
  // native side fetches each file individually and never reads this.
  url: `${origin}/ota/latest.json`,
  builtAt: new Date().toISOString(),
  fileCount: manifest.length,
  totalBytes,
  manifest,
}

await writeFile(join(otaDir, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`)

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
console.log(
  `OTA ${version}: ${manifest.length} files (${mb(totalBytes)}), ` +
    `${reusedCount} reused from the site, ${mb(publishedBytes)} added under ota/files/`,
)
