import rawStories from './stories.data.json'

export type StoryLang = 'ar' | 'en'
export type SpeakerId = string
export type MoodId =
  | 'warm'
  | 'happy'
  | 'excited'
  | 'sad'
  | 'gentle'
  | 'kind'
  | 'curious'
  | 'calm'
  | 'proud'

export type StorySegment = {
  speaker: SpeakerId
  mood: MoodId
  en: string
  ar: string
  audioEn: string
  audioAr: string
}

export type StoryPage = {
  id: string
  image: string
  textEn: string
  textAr: string
  segments: StorySegment[]
}

export type Story = {
  id: string
  title: string
  titleAr: string
  subtitle: string
  subtitleAr: string
  coverImage: string
  ageLabel: string
  theme: string
  themeAr: string
  /** One clear learning goal for the child */
  mainGoalEn: string
  mainGoalAr: string
  learningGoals: string[]
  learningGoalsAr: string[]
  cast: SpeakerId[]
  pages: StoryPage[]
  locked?: boolean
}

export const SPEAKER_META: Record<
  string,
  { labelEn: string; labelAr: string; emoji: string; color: string }
> = {
  narrator: { labelEn: 'Narrator', labelAr: 'الراوي', emoji: '📖', color: '#8b5cf6' },
  pip: { labelEn: 'Pip', labelAr: 'بيب', emoji: '🐶', color: '#f59e0b' },
  mimi: { labelEn: 'Mimi', labelAr: 'ميمي', emoji: '🐱', color: '#38bdf8' },
  luna: { labelEn: 'Luna', labelAr: 'لونا', emoji: '🐰', color: '#a78bfa' },
  star: { labelEn: 'Star', labelAr: 'النجمة', emoji: '⭐', color: '#fbbf24' },
  sam: { labelEn: 'Sam', labelAr: 'سام', emoji: '🐻', color: '#fb923c' },
  mama: { labelEn: 'Mama', labelAr: 'ماما', emoji: '🐻‍❄️', color: '#f472b6' },
  nour: { labelEn: 'Nour', labelAr: 'نور', emoji: '🦊', color: '#f97316' },
  zuzu: { labelEn: 'Zuzu', labelAr: 'زوزو', emoji: '🐤', color: '#eab308' },
  riri: { labelEn: 'Riri', labelAr: 'ريري', emoji: '🐦', color: '#ec4899' },
  tito: { labelEn: 'Tito', labelAr: 'تيتو', emoji: '🐘', color: '#64748b' },
  titoMama: { labelEn: 'Mama', labelAr: 'ماما', emoji: '🐘', color: '#94a3b8' },
  brushy: { labelEn: 'Brushy', labelAr: 'فرّوش', emoji: '🦛', color: '#06b6d4' },
  kiko: { labelEn: 'Kiko', labelAr: 'كيكو', emoji: '🐵', color: '#a16207' },
  friend: { labelEn: 'Friend', labelAr: 'الصاحب', emoji: '🐯', color: '#f59e0b' },
  lulu: { labelEn: 'Lulu', labelAr: 'لولو', emoji: '🐑', color: '#e2e8f0' },
  ducky: { labelEn: 'Ducky', labelAr: 'بطوطة', emoji: '🦆', color: '#84cc16' },
}

/**
 * Raw story content — the single source of truth shared with the audio
 * generator (scripts/generate_audio.py reads the same stories.data.json).
 * Derived fields (segment audio paths, page text) are computed here at load
 * time, so JSON never stores anything that can drift from the file layout.
 */
type RawSegment = { speaker: SpeakerId; mood: MoodId; en: string; ar: string }
type RawPage = { id: string; image: string; segments: RawSegment[] }
type RawStory = Omit<Story, 'pages'> & { pages: RawPage[] }

function segs(storyId: string, pageId: string, list: RawSegment[]): StorySegment[] {
  return list.map((s, idx) => ({
    ...s,
    audioEn: `/audio/${storyId}/${pageId}-s${idx}-en.mp3`,
    audioAr: `/audio/${storyId}/${pageId}-s${idx}-ar.mp3`,
  }))
}

function page(storyId: string, raw: RawPage): StoryPage {
  const segments = segs(storyId, raw.id, raw.segments)
  return {
    id: raw.id,
    image: raw.image,
    textEn: raw.segments.map((s) => s.en).join(' '),
    textAr: raw.segments.map((s) => s.ar).join(' '),
    segments,
  }
}

function buildStory(raw: RawStory): Story {
  return {
    ...raw,
    pages: raw.pages.map((p) => page(raw.id, p)),
  }
}

export const stories: Story[] = (rawStories as RawStory[]).map(buildStory)

export function getStoryById(id: string): Story | undefined {
  return stories.find((s) => s.id === id)
}

export function pageText(page: StoryPage, lang: StoryLang): string {
  return lang === 'ar' ? page.textAr : page.textEn
}

export function segmentText(seg: StorySegment, lang: StoryLang): string {
  return lang === 'ar' ? seg.ar : seg.en
}

export function segmentAudio(seg: StorySegment, lang: StoryLang): string {
  return lang === 'ar' ? seg.audioAr : seg.audioEn
}

export function speakerLabel(id: SpeakerId, lang: StoryLang): string {
  const meta = SPEAKER_META[id]
  if (!meta) return id
  return lang === 'ar' ? meta.labelAr : meta.labelEn
}
