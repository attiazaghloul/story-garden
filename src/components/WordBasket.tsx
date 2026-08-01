import { useWordAudioMap } from '../hooks/useWordAudioMap'
import { useStoryAudio } from '../hooks/useStoryAudio'

type WordBasketProps = {
  words: string[]
}

/**
 * Every word the child tapped inside a story lands here, so vocabulary can be
 * replayed from the home screen without reopening the story.
 */
export function WordBasket({ words }: WordBasketProps) {
  const { lookup } = useWordAudioMap()
  const { playOne, activeMeta } = useStoryAudio()

  if (!words.length) return null

  return (
    <section className="word-basket" aria-labelledby="word-basket-heading">
      <div className="word-basket-head">
        <h2 id="word-basket-heading">🧺 My words</h2>
        <p>
          {words.length} {words.length === 1 ? 'word' : 'words'} you tapped — tap again to hear
          them
        </p>
      </div>
      <div className="word-basket-list">
        {words.map((word) => {
          const src = lookup('en', word)
          return (
            <button
              key={word}
              type="button"
              className={`basket-word ${activeMeta === `word:${word}` ? 'is-saying' : ''}`}
              disabled={!src}
              onClick={() => src && playOne(src, `word:${word}`)}
            >
              <span aria-hidden>🔊</span> {word}
            </button>
          )
        })}
      </div>
    </section>
  )
}
