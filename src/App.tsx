import { useState } from 'react'
import { Home } from './components/Home'
import { LanguagePick } from './components/LanguagePick'
import { StoryReader } from './components/StoryReader'
import { getStoryById, stories, type StoryLang } from './data/stories'
import './App.css'

type View =
  | { name: 'home' }
  | { name: 'lang'; storyId: string }
  | { name: 'story'; storyId: string; lang: StoryLang }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })

  if (view.name === 'lang' || view.name === 'story') {
    const story = getStoryById(view.storyId)
    if (!story || story.locked || !story.pages.length) {
      return (
        <div className="app-shell">
          <main className="app-main">
            <p className="empty-state">القصة دي لسه مش جاهزة.</p>
            <button type="button" className="btn btn-primary" onClick={() => setView({ name: 'home' })}>
              رجوع
            </button>
          </main>
        </div>
      )
    }

    if (view.name === 'lang') {
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

    return (
      <div className="app-shell">
        <main className="app-main">
          <StoryReader
            story={story}
            lang={view.lang}
            onBack={() => setView({ name: 'home' })}
            onChangeLang={() => setView({ name: 'lang', storyId: story.id })}
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
          onOpenStory={(storyId) => setView({ name: 'lang', storyId })}
        />
      </main>
      <footer className="app-footer">
        <span>Story Garden · عربي مصري أو إنجليزي أمريكي — مش الاتنين مع بعض</span>
      </footer>
    </div>
  )
}
