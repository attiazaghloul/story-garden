import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeakerId, Story, StoryLang } from '../data/stories'
import { SPEAKER_META, segmentAudio, speakerLabel } from '../data/stories'
import { SPEED_OPTIONS, useStoryAudio } from '../hooks/useStoryAudio'
import { useSwipe } from '../hooks/useSwipe'
import { useWordAudioMap } from '../hooks/useWordAudioMap'
import { prefetchStory } from '../lib/prefetchStory'
import { ClickableStoryText } from './ClickableStoryText'
import { StoryQuiz } from './StoryQuiz'

type StoryReaderProps = {
  story: Story
  lang: StoryLang
  /** Page to open on — lets the library resume where the child stopped. */
  startPage?: number
  onBack: () => void
  onChangeLang: () => void
  showLanguageSwitcher?: boolean
  onPageChange?: (pageIndex: number, isLast: boolean) => void
  onWordHeard?: (word: string) => void
  onStars?: (stars: number) => void
}

export function StoryReader({
  story,
  lang,
  startPage = 0,
  onBack,
  onChangeLang,
  showLanguageSwitcher = true,
  onPageChange,
  onWordHeard,
  onStars,
}: StoryReaderProps) {
  const [pageIndex, setPageIndex] = useState(() =>
    Math.min(Math.max(0, startPage), Math.max(0, story.pages.length - 1)),
  )
  const [showEnd, setShowEnd] = useState(false)
  const [turnDir, setTurnDir] = useState<'next' | 'prev'>('next')
  const [autoPlay, setAutoPlay] = useState(false)
  const [activeWord, setActiveWord] = useState<string | undefined>()
  const { playQueue, playOne, stop, status, activeMeta, activeIndex, isPlaying, speed, setSpeed } =
    useStoryAudio()
  const { lookup, ready: wordsReady } = useWordAudioMap()

  const page = story.pages[pageIndex]
  const total = story.pages.length
  const progress = showEnd ? 100 : ((pageIndex + 1) / total) * 100
  const isFirst = pageIndex === 0
  const isLast = pageIndex === total - 1
  const isAr = lang === 'ar'

  const activeSpeaker = (activeMeta as SpeakerId | undefined) ?? undefined
  const activeSpeakerMeta = activeSpeaker ? SPEAKER_META[activeSpeaker] : undefined

  useEffect(() => {
    stop()
    setAutoPlay(false)
    setActiveWord(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    stop()
    setActiveWord(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex])

  useEffect(() => () => stop(), [stop])

  // Pull the rest of the story down while page one is being read, so the child
  // can finish it even if the network drops.
  useEffect(() => prefetchStory(story, lang), [story, lang])

  useEffect(() => {
    onPageChange?.(pageIndex, pageIndex === total - 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, total])

  const playPage = (onEnd?: () => void) => {
    if (!page) return
    const items = page.segments.map((seg) => ({
      src: segmentAudio(seg, lang),
      meta: seg.speaker,
    }))
    playQueue(items, {
      pauseMs: 320,
      onEnd,
      onItem: () => setActiveWord(undefined),
    })
  }

  useEffect(() => {
    if (!autoPlay || !page || showEnd) return
    const t = window.setTimeout(() => {
      playPage(() => {
        if (pageIndex < total - 1) {
          setTurnDir('next')
          setPageIndex((i) => i + 1)
        } else setAutoPlay(false)
      })
    }, 280)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, pageIndex, lang, showEnd])

  const sayWord = useCallback(
    (word: string) => {
      const src = lookup(lang, word)
      if (src) playOne(src, `word:${word}`)
    },
    [lang, lookup, playOne],
  )

  const onWordClick = (word: string) => {
    setAutoPlay(false)
    const src = lookup(lang, word)
    if (!src) {
      setActiveWord(word)
      window.setTimeout(() => setActiveWord(undefined), 400)
      return
    }
    setActiveWord(word)
    onWordHeard?.(word)
    playOne(src, `word:${word}`, () => setActiveWord(undefined))
  }

  const goPrev = useCallback(() => {
    stop()
    setAutoPlay(false)
    setTurnDir('prev')
    if (showEnd) {
      setShowEnd(false)
      return
    }
    setPageIndex((i) => Math.max(0, i - 1))
  }, [showEnd, stop])

  const goNext = useCallback(() => {
    stop()
    setAutoPlay(false)
    setTurnDir('next')
    if (showEnd) return
    // Swiping past the last page opens the celebration + questions screen.
    if (pageIndex >= total - 1) setShowEnd(true)
    else setPageIndex(pageIndex + 1)
  }, [pageIndex, showEnd, stop, total])

  // Arrow keys mirror the swipe, so a keyboard or a paired remote works too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (isAr) goPrev()
        else goNext()
      } else if (e.key === 'ArrowLeft') {
        if (isAr) goNext()
        else goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, isAr])

  const swipe = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => (isAr ? goPrev() : goNext()),
    onSwipeRight: () => (isAr ? goNext() : goPrev()),
  })

  // Coach the swipe gesture once — it disappears on the first turn, or on its own.
  const [hintDone, setHintDone] = useState(false)
  const firstPage = useRef(pageIndex)
  useEffect(() => {
    if (pageIndex !== firstPage.current) setHintDone(true)
  }, [pageIndex])
  useEffect(() => {
    const t = window.setTimeout(() => setHintDone(true), 5000)
    return () => window.clearTimeout(t)
  }, [])

  if (!page) {
    return (
      <div className="reader">
        <p>Story not ready.</p>
        <button type="button" className="btn" onClick={onBack}>
          {isAr ? 'رجوع' : 'Back'}
        </button>
      </div>
    )
  }

  return (
    <div className={`reader ${isAr ? 'is-ar' : 'is-en'}`}>
      <header className="reader-top">
        <button type="button" className="btn btn-ghost btn-icon" onClick={onBack} aria-label={isAr ? 'المكتبة' : 'Library'}>
          ←
        </button>
        <div className="reader-top-info">
          <strong>{isAr ? story.titleAr : story.title}</strong>
          <span>
            {showEnd
              ? isAr
                ? 'خلصنا القصة 🌟'
                : 'Story finished 🌟'
              : isAr
                ? `صفحة ${pageIndex + 1} من ${total}`
                : `Page ${pageIndex + 1} of ${total}`}
          </span>
        </div>
        {showLanguageSwitcher && (
          <button type="button" className="chip is-on" onClick={onChangeLang}>
            {isAr ? '🇺🇸 EN' : '🇪🇬 ع'}
          </button>
        )}
      </header>

      <div className="progress-track" aria-hidden>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div
        className={`story-stage ${isPlaying ? 'is-reading' : ''} ${showEnd ? 'is-end' : ''}`}
        ref={swipe.ref}
        {...swipe.handlers}
      >
        {showEnd ? (
          <div className="story-end" key="end">
            <h3>{isAr ? 'برافو عليك! 🌟' : 'Great job! 🌟'}</h3>
            <p className="story-end-goal">🎯 {isAr ? story.mainGoalAr : story.mainGoalEn}</p>

            {story.quiz.length > 0 && (
              <StoryQuiz
                questions={story.quiz}
                lang={lang}
                onSayWord={sayWord}
                onFinish={(stars) => onStars?.(stars)}
              />
            )}

            <ul className="end-goals">
              {(isAr ? story.learningGoalsAr : story.learningGoals).map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>

            <div className="end-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  stop()
                  setAutoPlay(false)
                  setShowEnd(false)
                  setPageIndex(0)
                }}
              >
                {isAr ? 'من الأول تاني' : 'Read again'}
              </button>
              {showLanguageSwitcher && (
                <button type="button" className="btn btn-secondary" onClick={onChangeLang}>
                  {isAr ? '🇺🇸 English' : '🇪🇬 عربي'}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onBack}>
                {isAr ? 'رجوع للمكتبة' : 'Back to library'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="story-art-frame">
              <img
                key={page.id}
                src={page.image}
                alt={
                  isAr
                    ? `${story.titleAr} — صفحة ${pageIndex + 1}`
                    : `${story.title} — page ${pageIndex + 1}`
                }
                className={`story-art turn-${turnDir}`}
                draggable={false}
              />
              {activeSpeakerMeta && (
                <div className="now-speaking">
                  <span aria-hidden>{activeSpeakerMeta.emoji}</span>
                  {isAr
                    ? `بيتكلم: ${speakerLabel(activeSpeaker!, 'ar')}`
                    : `Speaking: ${speakerLabel(activeSpeaker!, 'en')}`}
                </div>
              )}
              {!hintDone && (
                <div className="swipe-hint">
                  <span aria-hidden>👉</span>
                  {isAr ? 'اسحب لتقلب الصفحة' : 'Swipe to turn the page'}
                </div>
              )}
            </div>

            <div className="story-text-panel" key={`text-${page.id}`}>
              <div className="story-text-scroll">
                <ClickableStoryText
                  segments={page.segments}
                  lang={lang}
                  activeSpeaker={activeSpeaker}
                  activeSegmentIndex={activeIndex}
                  activeWord={activeWord}
                  onWordClick={onWordClick}
                />
              </div>

              <div className="panel-controls">
                <div className="audio-row">
                  <button
                    type="button"
                    className={`btn btn-audio ${isPlaying && !activeWord ? 'is-live' : ''}`}
                    onClick={() => {
                      if (isPlaying) stop()
                      else {
                        setAutoPlay(false)
                        playPage()
                      }
                    }}
                  >
                    {isPlaying && !activeWord
                      ? isAr
                        ? '⏹ وقّف'
                        : '⏹ Stop'
                      : isAr
                        ? '🔊 احكي الصفحة'
                        : '🔊 Read page'}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-secondary ${autoPlay ? 'is-live' : ''}`}
                    onClick={() => {
                      if (autoPlay) {
                        setAutoPlay(false)
                        stop()
                      } else {
                        setAutoPlay(true)
                      }
                    }}
                  >
                    {autoPlay
                      ? isAr
                        ? '⏸ وقّف'
                        : '⏸ Stop auto'
                      : isAr
                        ? '▶️ احكي الكل'
                        : '▶️ Play all'}
                  </button>
                </div>

                <div
                  className="speed-control"
                  role="group"
                  aria-label={isAr ? 'سرعة الصوت' : 'Playback speed'}
                >
                  <span className="speed-label">{isAr ? 'السرعة' : 'Speed'}</span>
                  <div className="speed-options">
                    {SPEED_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`speed-btn ${speed === opt.value ? 'is-on' : ''}`}
                        onClick={() => setSpeed(opt.value)}
                        title={isAr ? opt.labelAr : opt.label}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {!wordsReady && (
                  <p className="audio-fallback">
                    {isAr ? 'جاري تجهيز نطق الكلمات…' : 'Loading word sounds…'}
                  </p>
                )}
                {status === 'error' && (
                  <p className="audio-fallback">
                    {isAr
                      ? 'في مشكلة في ملف الصوت. جرّب كلمة أو صفحة تانية.'
                      : 'Audio issue. Try another word or page.'}
                  </p>
                )}
              </div>
            </div>

          </>
        )}
      </div>

      <nav className="reader-nav" aria-label="Story pages">
        <button
          type="button"
          className="page-arrow"
          onClick={goPrev}
          disabled={isFirst && !showEnd}
          aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
        >
          {isAr ? '›' : '‹'}
        </button>

        <div className="nav-center">
          <div className="dots" role="tablist">
            {story.pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={!showEnd && i === pageIndex}
                className={`dot ${!showEnd && i === pageIndex ? 'is-active' : ''} ${
                  showEnd || i < pageIndex ? 'is-done' : ''
                }`}
                onClick={() => {
                  stop()
                  setAutoPlay(false)
                  setShowEnd(false)
                  setTurnDir(i > pageIndex ? 'next' : 'prev')
                  setPageIndex(i)
                }}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
          <p className="voice-hint">
            {isAr
              ? 'اسحب يمين أو شمال · دوس على أي كلمة تسمعها'
              : 'Swipe left or right · tap any word to hear it'}
          </p>
        </div>

        <button
          type="button"
          className={`page-arrow ${isLast && !showEnd ? 'is-finish' : ''}`}
          onClick={goNext}
          disabled={showEnd}
          aria-label={
            isLast ? (isAr ? 'النهاية' : 'Finish') : isAr ? 'الصفحة التالية' : 'Next page'
          }
        >
          {isLast ? '⭐' : isAr ? '‹' : '›'}
        </button>
      </nav>
    </div>
  )
}
