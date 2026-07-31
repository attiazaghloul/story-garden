import type { StoryLang, StorySegment, SpeakerId } from '../data/stories'
import { SPEAKER_META, segmentText } from '../data/stories'

type ClickableStoryTextProps = {
  segments: StorySegment[]
  lang: StoryLang
  activeSpeaker?: SpeakerId | string
  activeSegmentIndex?: number
  activeWord?: string
  onWordClick: (word: string) => void
}

type Token =
  | { type: 'word'; value: string; key: string }
  | { type: 'space'; value: string; key: string }
  | { type: 'punct'; value: string; key: string }

function tokenize(text: string, lang: StoryLang): Token[] {
  const tokens: Token[] = []
  let i = 0
  if (lang === 'en') {
    const re = /([A-Za-z']+)|(\s+)|([^A-Za-z'\s]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      if (m[1]) tokens.push({ type: 'word', value: m[1], key: `w${i++}` })
      else if (m[2]) tokens.push({ type: 'space', value: m[2], key: `s${i++}` })
      else if (m[3]) tokens.push({ type: 'punct', value: m[3], key: `p${i++}` })
    }
    return tokens
  }

  // Split on spaces first, then peel Arabic punctuation off each token
  const parts = text.split(/(\s+)/)
  for (const part of parts) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      tokens.push({ type: 'space', value: part, key: `s${i++}` })
      continue
    }
    // leading punct
    const lead = part.match(/^[،؛؟ـ.…٬٫«»!؟"']+/)
    let rest = part
    if (lead) {
      tokens.push({ type: 'punct', value: lead[0], key: `p${i++}` })
      rest = part.slice(lead[0].length)
    }
    const trail = rest.match(/[،؛؟ـ.…٬٫«»!؟"']+$/)
    let word = rest
    if (trail) {
      word = rest.slice(0, -trail[0].length)
    }
    if (word) tokens.push({ type: 'word', value: word, key: `w${i++}` })
    if (trail) tokens.push({ type: 'punct', value: trail[0], key: `p${i++}` })
  }
  return tokens
}

export function ClickableStoryText({
  segments,
  lang,
  activeSpeaker,
  activeSegmentIndex = -1,
  activeWord,
  onWordClick,
}: ClickableStoryTextProps) {
  const isAr = lang === 'ar'

  return (
    <div className={`story-lines ${isAr ? 'is-ar' : 'is-en'}`} lang={isAr ? 'ar' : 'en'}>
      {segments.map((seg, segIdx) => {
        const text = segmentText(seg, lang)
        const meta = SPEAKER_META[seg.speaker] ?? {
          labelEn: seg.speaker,
          labelAr: seg.speaker,
          emoji: '🎙️',
          color: '#94a3b8',
        }
        const isActive = activeSegmentIndex === segIdx || activeSpeaker === seg.speaker
        const tokens = tokenize(text, lang)

        return (
          <div
            key={`${seg.speaker}-${segIdx}`}
            className={`story-line ${isActive && activeSegmentIndex === segIdx ? 'is-speaking' : ''}`}
            style={{ ['--line-accent' as string]: meta.color }}
          >
            <span className="story-line-badge" title={isAr ? meta.labelAr : meta.labelEn}>
              <span aria-hidden>{meta.emoji}</span>
              <span>{isAr ? meta.labelAr : meta.labelEn}</span>
            </span>
            <p className={isAr ? 'story-arabic-main' : 'story-english'}>
              {tokens.map((t) => {
                if (t.type !== 'word') {
                  return <span key={t.key}>{t.value}</span>
                }
                const norm = lang === 'en' ? t.value.toLowerCase() : t.value
                const wordActive =
                  activeWord != null &&
                  (lang === 'en' ? activeWord.toLowerCase() === norm : activeWord === t.value)
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`word-chip ${wordActive ? 'is-active' : ''}`}
                    onClick={() => onWordClick(t.value)}
                    title={isAr ? `اسمع: ${t.value}` : `Hear: ${t.value}`}
                  >
                    {t.value}
                  </button>
                )
              })}
            </p>
          </div>
        )
      })}
      <p className="word-tip">
        {isAr ? 'دوس على أي كلمة تسمع نطقها 🔊' : 'Tap any word to hear it 🔊'}
      </p>
    </div>
  )
}
