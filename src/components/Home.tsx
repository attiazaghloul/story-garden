import type { Story } from '../data/stories'
import type { StoryProgress } from '../hooks/useGarden'
import { APP_VERSION } from '../lib/appUpdate'
import { InstallButton } from './InstallButton'
import { WordBasket } from './WordBasket'

type HomeProps = {
  stories: Story[]
  onOpenStory: (storyId: string) => void
  progressFor: (storyId: string) => StoryProgress
  words: string[]
  totalStars: number
  finishedCount: number
  onResetProgress: () => void
}

export function Home({
  stories,
  onOpenStory,
  progressFor,
  words,
  totalStars,
  finishedCount,
  onResetProgress,
}: HomeProps) {
  const readyCount = stories.filter((s) => !s.locked).length
  const gardenPercent = readyCount ? Math.round((finishedCount / readyCount) * 100) : 0

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-badge">Little Ears · Big Hearts</div>
        <h1 className="hero-title">
          <span className="hero-title-en">Story Garden</span>
        </h1>
        <p className="hero-lead">
          <strong>{readyCount} educational stories</strong> — each story teaches one clear idea
          through friendly characters, expressive voices, and tappable words.
        </p>

        <div className="garden-progress" aria-label="Reading progress">
          <div className="garden-progress-top">
            <span className="garden-progress-label">
              🌱 {finishedCount} of {readyCount} stories read
            </span>
            <span className="garden-progress-stars">⭐ {totalStars}</span>
          </div>
          <div className="garden-progress-track">
            <div className="garden-progress-fill" style={{ width: `${gardenPercent}%` }} />
          </div>
        </div>

        <InstallButton />
      </header>

      <section className="library" aria-labelledby="library-heading">
        <div className="section-head">
          <h2 id="library-heading">Story Library</h2>
          <p>Tap a story to open it — no buttons needed.</p>
        </div>

        <div className="story-grid">
          {stories.map((story, index) => {
            const progress = progressFor(story.id)
            const started = !progress.finished && progress.lastPage > 0
            const openable = !story.locked
            const status = story.locked
              ? 'Coming soon'
              : progress.finished
                ? 'Read again'
                : started
                  ? `Continue · page ${progress.lastPage + 1}`
                  : 'Tap to read'

            return (
              <article
                key={story.id}
                className={`story-card ${story.locked ? 'is-locked' : 'is-open'} ${
                  progress.finished ? 'is-finished' : ''
                }`}
                role={openable ? 'button' : undefined}
                tabIndex={openable ? 0 : undefined}
                aria-disabled={openable ? undefined : true}
                aria-label={openable ? `${story.title} — ${status}` : `${story.title} — coming soon`}
                onClick={() => openable && onOpenStory(story.id)}
                onKeyDown={(e) => {
                  if (!openable) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenStory(story.id)
                  }
                }}
              >
                <div className="story-card-cover-wrap">
                  <img
                    src={story.coverImage}
                    alt=""
                    className="story-card-cover"
                    loading="lazy"
                    draggable={false}
                  />
                  {story.locked ? (
                    <div className="lock-badge">Coming soon</div>
                  ) : progress.finished ? (
                    <div className="done-badge">
                      ✓ {progress.stars > 0 && <span>{'⭐'.repeat(progress.stars)}</span>}
                    </div>
                  ) : (
                    <div className="new-badge">Ready</div>
                  )}
                  <div className="story-card-num">{String(index + 1).padStart(2, '0')}</div>
                </div>

                <div className="story-card-body">
                  <p className="story-card-theme">{story.theme}</p>
                  <h3 className="story-card-title">
                    <span>{story.title}</span>
                  </h3>
                  <p className="story-card-goal">🎯 {story.mainGoalEn}</p>
                  <div className="story-card-meta">
                    <span>Ages 4–6</span>
                    {!story.locked && <span>{story.pages.length} pages</span>}
                  </div>
                  <p className={`story-card-cta ${started ? 'is-continue' : ''}`}>
                    {story.locked ? '✨ Coming soon' : started ? `▶ ${status}` : `📖 ${status}`}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <WordBasket words={words} />

      <section className="parent-note" aria-labelledby="parent-heading">
        <h2 id="parent-heading">A note for grown-ups</h2>
        <p>
          Stories use simple English, one voice per character, and ready-made audio files for
          consistent playback. Children can tap any word to hear it again without leaving the page.
          Stars come from two gentle questions at the end of each story — a wrong tap never ends the
          activity, it just invites another try.
        </p>
        <p className="app-version">
          Version {APP_VERSION} · updates install themselves in the background
        </p>
        {(finishedCount > 0 || words.length > 0) && (
          <button type="button" className="btn btn-ghost reset-btn" onClick={onResetProgress}>
            Reset stars and words
          </button>
        )}
      </section>
    </div>
  )
}
