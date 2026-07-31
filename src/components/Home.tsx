import type { Story } from '../data/stories'
import { InstallButton } from './InstallButton'

type HomeProps = {
  stories: Story[]
  onOpenStory: (storyId: string) => void
}

export function Home({ stories, onOpenStory }: HomeProps) {
  const readyCount = stories.filter((s) => !s.locked).length
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
        <ul className="hero-pills" aria-label="Features">
          <li>📚 {readyCount} stories · one goal each</li>
          <li>🎚️ Adjustable reading speed</li>
          <li>🔊 Tap any word to hear it</li>
        </ul>
        <InstallButton />
      </header>

      <section className="library" aria-labelledby="library-heading">
        <div className="section-head">
          <h2 id="library-heading">Story Library</h2>
          <p>Each story builds a small value or skill for ages 4–6.</p>
        </div>

        <div className="story-grid">
          {stories.map((story, index) => (
            <article
              key={story.id}
              className={`story-card ${story.locked ? 'is-locked' : 'is-open'}`}
            >
              <div className="story-card-cover-wrap">
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="story-card-cover"
                  loading="lazy"
                  draggable={false}
                />
                {story.locked ? (
                  <div className="lock-badge">Coming soon</div>
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
                <p className="story-card-sub">{story.subtitle}</p>
                <div className="story-card-meta">
                  <span>Ages 4–6</span>
                  {!story.locked && <span>{story.pages.length} pages</span>}
                  {!story.locked && <span>English</span>}
                </div>

                <button
                  type="button"
                  className="btn btn-primary story-card-btn"
                  disabled={!!story.locked}
                  onClick={() => onOpenStory(story.id)}
                >
                  {story.locked ? 'Coming soon ✨' : 'Read this story 📖'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="parent-note" aria-labelledby="parent-heading">
        <h2 id="parent-heading">A note for grown-ups</h2>
        <p>
          Stories use simple English, one voice per character, and ready-made audio files for
          consistent playback. Children can tap any word to hear it again without leaving the page.
        </p>
      </section>
    </div>
  )
}
