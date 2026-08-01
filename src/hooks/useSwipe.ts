import { useCallback, useEffect, useRef } from 'react'

type SwipeOptions = {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  /** Minimum horizontal travel (px) before a drag counts as a page turn. */
  threshold?: number
}

/**
 * Horizontal page-turn gestures for the reader.
 *
 * The gesture ends on a window-level `pointerup` rather than pointer capture:
 * capturing on the stage would retarget the following `click` away from the
 * word buttons and quiz options inside it, silently breaking every tap.
 *
 * A swipe that starts on a word would still fire that word's click, so the
 * click right after a real swipe is swallowed in the capture phase. Vertical
 * drags are ignored so the text panel keeps scrolling normally.
 */
export function useSwipe<T extends HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
}: SwipeOptions) {
  const ref = useRef<T | null>(null)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const swiped = useRef(false)
  const handlers = useRef({ onSwipeLeft, onSwipeRight, threshold })
  handlers.current = { onSwipeLeft, onSwipeRight, threshold }

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    swiped.current = false
  }, [])

  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const from = start.current
      start.current = null
      if (!from || from.id !== e.pointerId) return
      const dx = e.clientX - from.x
      const dy = e.clientY - from.y
      const { threshold: min, onSwipeLeft: left, onSwipeRight: right } = handlers.current
      // Mostly-vertical drags belong to the scroller, not to the page turner.
      if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.2) return
      swiped.current = true
      if (dx < 0) left()
      else right()
    }
    const onCancel = () => {
      start.current = null
    }
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const swallow = (e: MouseEvent) => {
      if (!swiped.current) return
      swiped.current = false
      e.stopPropagation()
      e.preventDefault()
    }
    node.addEventListener('click', swallow, true)
    return () => node.removeEventListener('click', swallow, true)
  }, [])

  return { ref, handlers: { onPointerDown } }
}
