import type { Story } from '../data/stories'

/**
 * Pulls a story's pictures and narration into cache the moment it opens, so
 * page turns are instant and the whole story keeps working with no network.
 *
 * On the web these requests pass through the service worker, whose CacheFirst
 * rules for `/stories/` and `/audio/` store them permanently — a story read
 * once is a story readable offline. In the Android app the media already ships
 * inside the APK, so this only warms the WebView's own cache.
 *
 * Requests are issued a few at a time: a burst of ~60 files would compete with
 * the audio the child is waiting to hear on page one.
 */
const CONCURRENCY = 4

const started = new Set<string>()

async function warm(urls: string[], signal: AbortSignal): Promise<void> {
  let cursor = 0
  const worker = async () => {
    while (cursor < urls.length && !signal.aborted) {
      const url = urls[cursor++]
      try {
        await fetch(url, { signal, cache: 'force-cache' })
      } catch {
        /* one missing file must not stop the rest */
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

/**
 * Returns a cancel function. Prefetching the same story twice in a session is
 * a no-op — the cache already holds it.
 */
export function prefetchStory(story: Story, lang: 'ar' | 'en'): () => void {
  const key = `${story.id}:${lang}`
  if (started.has(key)) return () => {}
  started.add(key)

  const controller = new AbortController()

  // Page one is already loading on its own; everything after it is what
  // benefits from arriving early.
  const images = story.pages.map((p) => p.image)
  const audio = story.pages.flatMap((p) =>
    p.segments.map((s) => (lang === 'ar' ? s.audioAr : s.audioEn)),
  )

  void warm([...images, ...audio], controller.signal).catch(() => {
    // A failed warm-up leaves the story exactly as it was: loadable on demand.
    started.delete(key)
  })

  return () => controller.abort()
}
