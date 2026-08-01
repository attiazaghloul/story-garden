import { useMemo, useState } from 'react'
import type { QuizQuestion, StoryLang } from '../data/stories'

type StoryQuizProps = {
  questions: QuizQuestion[]
  lang: StoryLang
  /** Plays a word's bundled pronunciation, when one exists. */
  onSayWord: (word: string) => void
  /** Called once, with how many questions were answered right the first time. */
  onFinish: (stars: number) => void
}

type Shuffled = { question: QuizQuestion; order: number[] }

/** Stable per-mount shuffle so the answer isn't always in the same corner. */
function shuffle(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function StoryQuiz({ questions, lang, onSayWord, onFinish }: StoryQuizProps) {
  const isAr = lang === 'ar'
  const deck = useMemo<Shuffled[]>(
    () => questions.map((question) => ({ question, order: shuffle(question.options.length) })),
    [questions],
  )

  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [missed, setMissed] = useState(false)
  const [stars, setStars] = useState(0)
  const [done, setDone] = useState(false)

  const current = deck[step]
  if (!current) return null

  const answer = (optionIndex: number) => {
    if (picked != null) return
    const option = current.question.options[optionIndex]
    if (option.word) onSayWord(option.word)

    if (!option.correct) {
      // Never a dead end: mark the miss, let the child try again.
      setMissed(true)
      return
    }

    setPicked(optionIndex)
    const earned = missed ? stars : stars + 1
    setStars(earned)

    window.setTimeout(() => {
      if (step + 1 < deck.length) {
        setStep(step + 1)
        setPicked(null)
        setMissed(false)
      } else {
        setDone(true)
        onFinish(earned)
      }
    }, 900)
  }

  if (done) {
    const all = stars === deck.length
    return (
      <div className="quiz quiz-done">
        <p className="quiz-done-emoji" aria-hidden>
          {all ? '🏆' : '🌟'}
        </p>
        <h3>
          {all
            ? isAr
              ? 'كل الإجابات صح! 🏆'
              : 'All correct! 🏆'
            : isAr
              ? 'شاطر! جاوبت وخلّصت 🌟'
              : 'Nice work! You finished 🌟'}
        </h3>
        <p className="quiz-stars" aria-label={`${stars} stars`}>
          {Array.from({ length: deck.length }, (_, i) => (
            <span key={i} className={i < stars ? 'is-earned' : ''}>
              ⭐
            </span>
          ))}
        </p>
      </div>
    )
  }

  const { question, order } = current

  return (
    <section className="quiz" aria-live="polite">
      <p className="quiz-step">
        {isAr
          ? `سؤال ${step + 1} من ${deck.length}`
          : `Question ${step + 1} of ${deck.length}`}
      </p>
      <h3 className="quiz-question">{isAr ? question.ar : question.en}</h3>

      <div className={`quiz-options is-${question.type}`}>
        {order.map((optionIndex) => {
          const option = question.options[optionIndex]
          const isPicked = picked === optionIndex
          return (
            <button
              key={optionIndex}
              type="button"
              className={`quiz-option ${isPicked ? 'is-correct' : ''}`}
              onClick={() => answer(optionIndex)}
              disabled={picked != null}
            >
              {option.image ? (
                <img src={option.image} alt="" className="quiz-option-img" draggable={false} />
              ) : (
                <>
                  <span className="quiz-option-emoji" aria-hidden>
                    {option.emoji}
                  </span>
                  <span className="quiz-option-word">{option.word}</span>
                </>
              )}
              {isPicked && (
                <span className="quiz-tick" aria-hidden>
                  ✅
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className={`quiz-hint ${missed && picked == null ? 'is-retry' : ''}`}>
        {missed && picked == null
          ? isAr
            ? 'قريّب! جرّب تاني 💛'
            : 'So close! Try again 💛'
          : isAr
            ? 'دوس على الإجابة الصح'
            : 'Tap the right answer'}
      </p>
    </section>
  )
}
