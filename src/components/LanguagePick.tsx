import type { Story, StoryLang } from '../data/stories'

type LanguagePickProps = {
  story: Story
  onPick: (lang: StoryLang) => void
  onBack: () => void
}

export function LanguagePick({ story, onPick, onBack }: LanguagePickProps) {
  return (
    <div className="lang-pick">
      <button type="button" className="btn btn-ghost lang-pick-back" onClick={onBack}>
        ← المكتبة
      </button>

      <div className="lang-pick-card">
        <img src={story.coverImage} alt={story.titleAr} className="lang-pick-cover" draggable={false} />
        <div className="lang-pick-body">
          <p className="lang-pick-kicker">اختار لغة الحكاية</p>
          <h2>
            <span className="lang-pick-title-ar">{story.titleAr}</span>
            <span className="lang-pick-title-en">{story.title}</span>
          </h2>
          <p className="lang-pick-note">
            العربي والإنجليزي مش مع بعض — عشان الطفل مايتشتتش. كل مرة لغة واحدة بس، بنصها وصوتها.
          </p>

          <div className="lang-pick-actions">
            <button type="button" className="btn btn-lang btn-lang-ar" onClick={() => onPick('ar')}>
              <span className="btn-lang-flag">🇪🇬</span>
              <span className="btn-lang-main">احكيها بالعربي</span>
              <span className="btn-lang-sub">مصري أصيل · صوت مولَّد</span>
            </button>

            <button type="button" className="btn btn-lang btn-lang-en" onClick={() => onPick('en')}>
              <span className="btn-lang-flag">🇺🇸</span>
              <span className="btn-lang-main">Tell it in English</span>
              <span className="btn-lang-sub">American accent · AI voice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
