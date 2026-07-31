import { useCallback, useEffect, useRef, useState } from 'react'

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'error'

export type PlayItem = {
  src: string
  /** Optional tag shown in UI (speaker id, word, etc.) */
  meta?: string
}

export const SPEED_OPTIONS = [
  { value: 0.7, label: '0.7×', labelAr: 'بطيء جدًا' },
  { value: 0.85, label: '0.85×', labelAr: 'بطيء' },
  { value: 1, label: '1×', labelAr: 'عادي' },
  { value: 1.15, label: '1.15×', labelAr: 'أسرع شوية' },
  { value: 1.3, label: '1.3×', labelAr: 'سريع' },
] as const

/**
 * Queued playback for multi-character story segments + single-word taps.
 * Uses bundled MP3s only (not browser speechSynthesis).
 */
export function useStoryAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prefetchRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<PlayItem[]>([])
  const indexRef = useRef(0)
  const pauseMsRef = useRef(300)
  const speedRef = useRef(1)
  const onEndRef = useRef<(() => void) | null>(null)
  const onItemRef = useRef<((meta: string | undefined, index: number) => void) | null>(null)
  const timerRef = useRef<number | null>(null)
  const generationRef = useRef(0)

  const [status, setStatus] = useState<AudioStatus>('idle')
  const [activeMeta, setActiveMeta] = useState<string | undefined>(undefined)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [speed, setSpeedState] = useState(1)

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const applySpeed = (rate: number) => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = rate
  }

  const setSpeed = useCallback((rate: number) => {
    const clamped = Math.min(1.5, Math.max(0.5, rate))
    speedRef.current = clamped
    setSpeedState(clamped)
    applySpeed(clamped)
  }, [])

  const hardStopAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    try {
      audio.load()
    } catch {
      /* ignore */
    }
  }

  const stop = useCallback(() => {
    generationRef.current += 1
    clearTimer()
    hardStopAudio()
    queueRef.current = []
    indexRef.current = 0
    onEndRef.current = null
    onItemRef.current = null
    setActiveMeta(undefined)
    setActiveIndex(-1)
    setStatus('idle')
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.playbackRate = speedRef.current
    audioRef.current = audio
    // Hidden element used only to warm the browser cache for the next clip,
    // so the gap between queued segments has no download latency.
    const prefetch = new Audio()
    prefetch.preload = 'auto'
    prefetchRef.current = prefetch
    return () => {
      generationRef.current += 1
      clearTimer()
      audio.pause()
      audioRef.current = null
      prefetch.removeAttribute('src')
      prefetchRef.current = null
    }
  }, [])

  const prefetchNext = (index: number) => {
    const next = queueRef.current[index + 1]
    const el = prefetchRef.current
    if (next && el && el.getAttribute('src') !== next.src) {
      el.src = next.src
    }
  }

  const playAt = useCallback((gen: number, index: number) => {
    if (gen !== generationRef.current) return
    const audio = audioRef.current
    const item = queueRef.current[index]
    if (!audio || !item) {
      setStatus('idle')
      setActiveMeta(undefined)
      setActiveIndex(-1)
      const cb = onEndRef.current
      onEndRef.current = null
      cb?.()
      return
    }

    indexRef.current = index
    setActiveMeta(item.meta)
    setActiveIndex(index)
    onItemRef.current?.(item.meta, index)
    setStatus('loading')

    hardStopAudio()
    audio.src = item.src
    audio.playbackRate = speedRef.current
    prefetchNext(index)
    audio.onended = () => {
      if (gen !== generationRef.current) return
      const next = index + 1
      if (next < queueRef.current.length) {
        clearTimer()
        // Keep pause roughly constant in real time (not stretched by speed)
        timerRef.current = window.setTimeout(() => playAt(gen, next), pauseMsRef.current)
      } else {
        setStatus('idle')
        setActiveMeta(undefined)
        setActiveIndex(-1)
        const cb = onEndRef.current
        onEndRef.current = null
        cb?.()
      }
    }
    audio.onerror = () => {
      if (gen !== generationRef.current) return
      const next = index + 1
      if (next < queueRef.current.length) {
        timerRef.current = window.setTimeout(() => playAt(gen, next), 80)
      } else {
        setStatus('error')
        setActiveMeta(undefined)
        setActiveIndex(-1)
      }
    }

    void audio
      .play()
      .then(() => {
        if (gen === generationRef.current) {
          audio.playbackRate = speedRef.current
          setStatus('playing')
        }
      })
      .catch(() => {
        if (gen === generationRef.current) setStatus('error')
      })
  }, [])

  const playQueue = useCallback(
    (
      items: PlayItem[],
      options?: {
        pauseMs?: number
        onEnd?: () => void
        onItem?: (meta: string | undefined, index: number) => void
      },
    ) => {
      stop()
      if (!items.length) return
      const gen = generationRef.current
      queueRef.current = items
      pauseMsRef.current = options?.pauseMs ?? 300
      onEndRef.current = options?.onEnd ?? null
      onItemRef.current = options?.onItem ?? null
      playAt(gen, 0)
    },
    [playAt, stop],
  )

  const playOne = useCallback(
    (src: string, meta?: string, onEnd?: () => void) => {
      playQueue([{ src, meta }], { pauseMs: 0, onEnd })
    },
    [playQueue],
  )

  return {
    playQueue,
    playOne,
    stop,
    status,
    activeMeta,
    activeIndex,
    speed,
    setSpeed,
    isPlaying: status === 'playing' || status === 'loading',
  }
}
