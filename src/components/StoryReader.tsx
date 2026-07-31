import { useEffect, useState } from 'react'
import type { SpeakerId, Story, StoryLang } from '../data/stories'
import { SPEAKER_META, segmentAudio, speakerLabel } from '../data/stories'
import { SPEED_OPTIONS, useStoryAudio } from '../hooks/useStoryAudio'
import { useWordAudioMap } from '../hooks/useWordAudioMap'
import { ClickableStoryText } from './ClickableStoryText'

type StoryReaderProps = {
  story: Story
  lang: StoryLang
  onBack: () => void
  onChangeLang: () => void
  showLanguageSwitcher?: boolean
}

export function StoryReader({
  story,
  lang,
  onBack,
  onChangeLang,
  showLanguageSwitcher = true,
}: StoryReaderProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [activeWord, setActiveWord] = useState<string | undefined>()
  const { playQueue, playOne, stop, status, activeMeta, activeIndex, isPlaying, speed, setSpeed } =
    useStoryAudio()
  const { lookup, ready: wordsReady } = useWordAudioMap()

  const page = story.pages[pageIndex]
  const total = story.pages.length
  const progress = ((pageIndex + 1) / total) * 100
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
    if (!autoPlay || !page) return
    const t = window.setTimeout(() => {
      playPage(() => {
        if (pageIndex < total - 1) setPageIndex((i) => i + 1)
        else setAutoPlay(false)
      })
    }, 280)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, pageIndex, lang])

  const onWordClick = (word: string) => {
    setAutoPlay(false)
    const src = lookup(lang, word)
    if (!src) {
      setActiveWord(word)
      window.setTimeout(() => setActiveWord(undefined), 400)
      return
    }
    setActiveWord(word)
    playOne(src, `word:${word}`, () => setActiveWord(undefined))
  }

  const goPrev = () => {
    stop()
    setAutoPlay(false)
    setPageIndex((i) => Math.max(0, i - 1))
  }

  const goNext = () => {
    stop()
    setAutoPlay(false)
    setPageIndex((i) => Math.min(total - 1, i + 1))
  }

  if (!page) {
    return (
      <div className="reader">
        <p>Story not ready.</p>
        <button type="button" className="btn" onClick={onBack}>
          رجوع
        </button>
      </div>
    )
  }

  return (
    <div className={`reader ${isAr ? 'is-ar' : 'is-en'}`}>
      <header className="reader-top">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          {isAr ? '← المكتبة' : '← Library'}
        </button>
        <div className="reader-top-info">
          <strong>{isAr ? story.titleAr : story.title}</strong>
          <span>
            {isAr
              ? 'شخصيات بأصوات مختلفة · اضغط أي كلمة'
              : 'Different character voices · tap any word'}
          </span>
        </div>
        {showLanguageSwitcher && (
          <div className="reader-top-actions">
            <button type="button" className="chip is-on" onClick={onChangeLang}>
              {isAr ? '🇺🇸 English' : '🇪🇬 عربي'}
            </button>
          </div>
        )}
      </header>

      <div className="progress-track" aria-hidden>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="page-indicator">
        {isAr ? `صفحة ${pageIndex + 1} من ${total}` : `Page ${pageIndex + 1} of ${total}`}
      </p>

      <div className={`story-stage ${isPlaying ? 'is-reading' : ''}`}>
        <div className="story-art-frame">
          <img
            key={page.id}
            src={page.image}
            alt={
              isAr
                ? `${story.titleAr} — صفحة ${pageIndex + 1}`
                : `${story.title} — page ${pageIndex + 1}`
            }
            className="story-art"
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
        </div>

        <div className="story-text-panel">
          <ClickableStoryText
            segments={page.segments}
            lang={lang}
            activeSpeaker={activeSpeaker}
            activeSegmentIndex={activeIndex}
            activeWord={activeWord}
            onWordClick={onWordClick}
          />

          <div className="speed-control" role="group" aria-label={isAr ? 'سرعة الصوت' : 'Playback speed'}>
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
            <span className="speed-hint">
              {isAr
                ? SPEED_OPTIONS.find((o) => o.value === speed)?.labelAr ?? 'عادي'
                : `${speed}×`}
            </span>
          </div>

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
                  ? '⏸ وقّف التلقائي'
                  : '⏸ Stop auto'
                : isAr
                  ? '▶️ احكي الكل'
                  : '▶️ Play all'}
            </button>
          </div>

          <div className="cast-row" aria-label={isAr ? 'الشخصيات' : 'Cast'}>
            {story.cast.map((id) => {
              const meta = SPEAKER_META[id]
              if (!meta) return null
              return (
                <span
                  key={id}
                  className={`cast-pill ${activeSpeaker === id ? 'is-on' : ''}`}
                  style={{ ['--cast' as string]: meta.color }}
                >
                  {meta.emoji} {isAr ? meta.labelAr : meta.labelEn}
                </span>
              )
            })}
          </div>

          <p className="voice-hint">
            {isAr
              ? 'كل شخصية بصوت · تحكم في السرعة · دوس على الكلمة'
              : 'One voice per character · speed control · tap a word'}
          </p>
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

      <nav className="reader-nav" aria-label="Story pages">
        <button type="button" className="btn btn-nav" onClick={goPrev} disabled={isFirst}>
          {isAr ? 'السابق' : 'Back'}
        </button>

        <div className="dots" role="tablist">
          {story.pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === pageIndex}
              className={`dot ${i === pageIndex ? 'is-active' : ''} ${i < pageIndex ? 'is-done' : ''}`}
              onClick={() => {
                stop()
                setAutoPlay(false)
                setPageIndex(i)
              }}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="btn btn-nav btn-primary"
          onClick={goNext}
          disabled={isLast}
        >
          {isLast ? (isAr ? 'النهاية ⭐' : 'The end ⭐') : isAr ? 'التالي' : 'Next'}
        </button>
      </nav>

      {isLast && (
        <div className="story-end">
          <h3>{isAr ? 'برافو عليك! 🌟' : 'Great job! 🌟'}</h3>
          <p className="story-end-goal">
            🎯 {isAr ? story.mainGoalAr : story.mainGoalEn}
          </p>
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
                setPageIndex(0)
              }}
            >
              {isAr ? 'من الأول تاني' : 'Start over'}
            </button>
            {showLanguageSwitcher && (
              <button type="button" className="btn btn-secondary" onClick={onChangeLang}>
                {isAr ? '🇺🇸 احكيها بالإنجليزي' : '🇪🇬 احكيها بالعربي'}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onBack}>
              {isAr ? 'رجوع للمكتبة' : 'Back to library'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
