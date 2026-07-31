import type { Story } from '../data/stories'
import { InstallButton } from './InstallButton'

type HomeProps = {
  stories: Story[]
  onOpenStory: (storyId: string) => void
}

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)])
}

export function Home({ stories, onOpenStory }: HomeProps) {
  const readyCount = stories.filter((s) => !s.locked).length
  const readyCountAr = toArabicDigits(readyCount)
  return (
    <div className="home">
      <header className="hero">
        <div className="hero-badge">Little Ears · Big Hearts</div>
        <h1 className="hero-title">
          <span className="hero-title-en">Story Garden</span>
          <span className="hero-title-ar">حديقة القصص</span>
        </h1>
        <p className="hero-lead">
          <strong>{readyCountAr} قصص تعليمية</strong> — كل قصة ليها هدف واضح يتعلمه الطفل. عربي مصري
          أو إنجليزي أمريكي (لغة واحدة في الجلسة)، مع سرعة صوت ونطق لكل كلمة.
        </p>
        <ul className="hero-pills" aria-label="Features">
          <li>📚 {readyCountAr} قصص · هدف لكل قصة</li>
          <li>🎚️ سرعة الصوت</li>
          <li>🇪🇬 مصري · 🇺🇸 أمريكي</li>
        </ul>
        <InstallButton />
      </header>

      <section className="library" aria-labelledby="library-heading">
        <div className="section-head">
          <h2 id="library-heading">مكتبة القصص</h2>
          <p>كل قصة = قيمة أو مهارة صغيرة لعمر ٤–٦ سنين</p>
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
                  alt={story.titleAr}
                  className="story-card-cover"
                  loading="lazy"
                  draggable={false}
                />
                {story.locked ? (
                  <div className="lock-badge">قريبًا</div>
                ) : (
                  <div className="new-badge">جاهزة</div>
                )}
                <div className="story-card-num">{String(index + 1).padStart(2, '0')}</div>
              </div>

              <div className="story-card-body">
                <p className="story-card-theme">{story.themeAr}</p>
                <h3 className="story-card-title">
                  <span>{story.titleAr}</span>
                  <small>{story.title}</small>
                </h3>
                <p className="story-card-goal">🎯 {story.mainGoalAr}</p>
                <p className="story-card-sub">{story.subtitleAr}</p>
                <div className="story-card-meta">
                  <span>{story.ageLabel}</span>
                  {!story.locked && <span>{story.pages.length} صفحات</span>}
                  {!story.locked && <span>AR / EN</span>}
                </div>

                <button
                  type="button"
                  className="btn btn-primary story-card-btn"
                  disabled={!!story.locked}
                  onClick={() => onOpenStory(story.id)}
                >
                  {story.locked ? 'قريبًا ✨' : 'اختار اللغة وابدأ 📖'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="parent-note" aria-labelledby="parent-heading">
        <h2 id="parent-heading">ملاحظة للأهل</h2>
        <p>
          اللغة الواحدة في الجلسة: إما حكاية مصرية كاملة بصوت مصري مولَّد، أو إنجليزية بسيطة
          بصوت أمريكي لطيف. مفيش نصين على نفس الصفحة عشان الطفل مايتشتتش. الأصوات ملفات جاهزة
          جوه التطبيق — مش أصوات المتصفح.
        </p>
      </section>
    </div>
  )
}
