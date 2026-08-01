import { useState } from 'react'
import { Home } from './components/Home'
import { LanguagePick } from './components/LanguagePick'
import { StoryReader } from './components/StoryReader'
import { ARABIC_ENABLED } from './config'
import { useGarden } from './hooks/useGarden'
import { getStoryById, stories, type StoryLang } from './data/stories'
import './App.css'

type View =
  | { name: 'home' }
  | { name: 'lang'; storyId: string }
  | { name: 'story'; storyId: string; lang: StoryLang }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const garden = useGarden()

  if (view.name === 'lang' || view.name === 'story') {
    const story = getStoryById(view.storyId)
    if (!story || story.locked || !story.pages.length) {
      return (
        <div className="app-shell">
          <main className="app-main">
            <p className="empty-state">This story is not ready yet.</p>
            <button type="button" className="btn btn-primary" onClick={() => setView({ name: 'home' })}>
              Back
            </button>
          </main>
        </div>
      )
    }

    if (view.name === 'lang' && ARABIC_ENABLED) {
      return (
        <div className="app-shell">
          <main className="app-main">
            <LanguagePick
              story={story}
              onBack={() => setView({ name: 'home' })}
              onPick={(lang) => setView({ name: 'story', storyId: story.id, lang })}
            />
          </main>
        </div>
      )
    }

    const saved = garden.progressFor(story.id)
    return (
      <div className="app-shell is-reader">
        <main className="app-main">
          <StoryReader
            key={`${story.id}-${view.name === 'story' ? view.lang : 'en'}`}
            story={story}
            lang={view.name === 'story' ? view.lang : 'en'}
            // Finished stories start over; an interrupted one picks up where it stopped.
            startPage={saved.finished ? 0 : saved.lastPage}
            onBack={() => setView({ name: 'home' })}
            onChangeLang={() => setView({ name: 'lang', storyId: story.id })}
            showLanguageSwitcher={ARABIC_ENABLED}
            onPageChange={(pageIndex, isLast) => garden.markPage(story.id, pageIndex, isLast)}
            onWordHeard={garden.collectWord}
            onStars={(stars) => garden.awardStars(story.id, stars)}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <Home
          stories={stories}
          onOpenStory={(storyId) =>
            setView(ARABIC_ENABLED ? { name: 'lang', storyId } : { name: 'story', storyId, lang: 'en' })
          }
          progressFor={garden.progressFor}
          words={garden.words}
          totalStars={garden.totalStars}
          finishedCount={garden.finishedCount}
          onResetProgress={garden.resetAll}
        />
      </main>
      <footer className="app-footer">
        <span>Story Garden · Gentle educational stories for little readers</span>
      </footer>
    </div>
  )
}
