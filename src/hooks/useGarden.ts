import { useCallback, useEffect, useState } from 'react'

/**
 * Everything the child earns lives in one localStorage record. No account, no
 * network — the tablet keeps the garden even offline, and a parent can reset it
 * from the home screen.
 */
const STORAGE_KEY = 'story-garden:v1'
const MAX_WORDS = 40

export type StoryProgress = {
  /** Last page the child was on (0-based) — used to offer "continue". */
  lastPage: number
  /** True once the child reached the final page. */
  finished: boolean
  /** Stars earned from the end-of-story questions (0–2). */
  stars: number
  /** How many times the story was completed. */
  reads: number
}

export type GardenState = {
  stories: Record<string, StoryProgress>
  /** Words the child tapped, newest first. */
  words: string[]
}

const EMPTY: GardenState = { stories: {}, words: [] }

const EMPTY_PROGRESS: StoryProgress = { lastPage: 0, finished: false, stars: 0, reads: 0 }

function read(): GardenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<GardenState>
    return {
      stories: parsed.stories && typeof parsed.stories === 'object' ? parsed.stories : {},
      words: Array.isArray(parsed.words) ? parsed.words.filter((w) => typeof w === 'string') : [],
    }
  } catch {
    // Private mode / corrupted value — start fresh rather than crash the app.
    return EMPTY
  }
}

function write(state: GardenState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked — progress is a bonus, never a blocker */
  }
}

export function useGarden() {
  const [state, setState] = useState<GardenState>(read)

  useEffect(() => {
    write(state)
  }, [state])

  const progressFor = useCallback(
    (storyId: string): StoryProgress => state.stories[storyId] ?? EMPTY_PROGRESS,
    [state.stories],
  )

  const update = useCallback(
    (storyId: string, patch: (prev: StoryProgress) => StoryProgress) => {
      setState((prev) => {
        const current = prev.stories[storyId] ?? EMPTY_PROGRESS
        const next = patch(current)
        if (
          next.lastPage === current.lastPage &&
          next.finished === current.finished &&
          next.stars === current.stars &&
          next.reads === current.reads
        ) {
          return prev
        }
        return { ...prev, stories: { ...prev.stories, [storyId]: next } }
      })
    },
    [],
  )

  const markPage = useCallback(
    (storyId: string, pageIndex: number, isLast: boolean) => {
      update(storyId, (prev) => ({
        ...prev,
        lastPage: pageIndex,
        finished: prev.finished || isLast,
        reads: isLast && !prev.finished ? prev.reads + 1 : prev.reads,
      }))
    },
    [update],
  )

  /** Stars never go down — a re-read can only improve the story's best score. */
  const awardStars = useCallback(
    (storyId: string, stars: number) => {
      update(storyId, (prev) => ({ ...prev, stars: Math.max(prev.stars, stars) }))
    },
    [update],
  )

  const restart = useCallback(
    (storyId: string) => {
      update(storyId, (prev) => ({ ...prev, lastPage: 0 }))
    },
    [update],
  )

  const collectWord = useCallback((word: string) => {
    const clean = word.trim().toLowerCase()
    if (!clean) return
    setState((prev) => {
      const words = [clean, ...prev.words.filter((w) => w !== clean)].slice(0, MAX_WORDS)
      return { ...prev, words }
    })
  }, [])

  const resetAll = useCallback(() => setState(EMPTY), [])

  const totalStars = Object.values(state.stories).reduce((sum, s) => sum + s.stars, 0)
  const finishedCount = Object.values(state.stories).filter((s) => s.finished).length

  return {
    words: state.words,
    totalStars,
    finishedCount,
    progressFor,
    markPage,
    awardStars,
    restart,
    collectWord,
    resetAll,
  }
}
