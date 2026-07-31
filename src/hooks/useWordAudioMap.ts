import { useEffect, useState } from 'react'
import type { StoryLang } from '../data/stories'

type WordMap = Record<StoryLang, Record<string, string>>

const EMPTY: WordMap = { en: {}, ar: {} }

export function useWordAudioMap() {
  const [map, setMap] = useState<WordMap>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/audio/words/manifest.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('missing words manifest'))))
      .then((data: WordMap) => {
        if (!cancelled) {
          setMap({
            en: data.en ?? {},
            ar: data.ar ?? {},
          })
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMap(EMPTY)
          setReady(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const lookup = (lang: StoryLang, word: string): string | undefined => {
    const key = lang === 'en' ? word.toLowerCase() : word
    return map[lang][key]
  }

  return { lookup, ready, map }
}
