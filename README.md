# Story Garden · حديقة القصص

تطبيق قصص أطفال تعليمي لسن **٤–٦ سنين** — يتسطّب على التابلت ويشتغل من غير نت.

- **١٠ قصص**، كل قصة ليها هدف تعليمي واضح (المشاركة، الصبر، الاعتذار، المشاعر، العدّ…)
- **لغة واحدة في الجلسة**: عربي مصري **أو** إنجليزي أمريكي (مش الاتنين مع بعض، عشان الطفل مايتشتتش)
- نصوص عربية مصرية أصلية (مش ترجمة حرفية)
- **أصوات مخزّنة جوه التطبيق** بمشاعر لكل مشهد — مش أصوات المتصفح
- **دوس على أي كلمة** تسمع نطقها
- تحكم في سرعة القراءة

## الواجهة (مظبوطة للتابلت)

- **الشاشة كلها = التطبيق**: مفيش سكرول للصفحة نفسها. الشاشة متقسّمة أربع صفوف ثابتة
  (العنوان، شريط التقدّم، المسرح، التنقّل)، واللي بيسكرول جواه بس هو نص القصة لو طويل.
- **الكارت كله زرار**: دوس في أي مكان في كارت القصة تفتح — مفيش زرار «اقرأ» منفصل
  (وبردو Enter/Space لو الكارت متحدّد بالكيبورد).
- **سواب يمين وشمال** جوه القصة عشان تقلب الصفحة. لو سحبت وإيدك بدأت فوق كلمة، الكلمة
  **مابتتنطقش** — السحبة بتاكل الضغطة، فمفيش صوت غلط.
  السحب الرأسي مابيقلبش صفحة (عشان يفضل ينفع تسكرول النص).
  سهمين صغيرين تحت + أسهم الكيبورد لسه شغّالين كبديل.
- **أفقي ورأسي**: أفقي الصورة جنب النص، ورأسي الصورة فوق النص.

## المتابعة والمكافآت (كله محلي، بدون نت أو حساب)

كل ده متخزّن في `localStorage` تحت مفتاح واحد `story-garden:v1`، وينفع الأهل يمسحوه من
زرار في آخر الصفحة الرئيسية.

- **نجوم**: في آخر كل قصة سؤالين لطيفين — سؤال بالصور (أنهي صورة فيها…؟) وسؤال بكلمة
  (بنقول إيه لما…؟). كل إجابة صح من أول مرة = نجمة. الإجابة الغلط **مابتنهيش النشاط**،
  بس بتقول «قريّب! جرّب تاني».
- **كمّل من مكانك**: لو الطفل ساب القصة في النص، الكارت بيقول «Continue · page N»
  والقصة بتفتح من نفس الصفحة.
- **سلّة الكلمات**: أي كلمة الطفل دوس عليها بتتحفظ، وفي قسم في الصفحة الرئيسية يقدر
  يدوس عليها تاني يسمعها من غير ما يفتح القصة.

## التشغيل

```bash
npm install
npm run dev
```

افتح `http://localhost:5173`.

## التسطيب على التابلت (PWA)

التطبيق **Progressive Web App** — يتسطّب زي أي تطبيق عادي:

1. ارفع نسخة الإنتاج على أي استضافة **HTTPS** (Netlify / Vercel / Cloudflare Pages / GitHub Pages).
2. افتح الرابط من متصفح التابلت.
3. **أندرويد (Chrome):** القائمة ⋮ ← «تثبيت التطبيق / Install app».
   **آيباد (Safari):** زرار المشاركة ← «إضافة إلى الشاشة الرئيسية».

بعد التسطيب: أيقونة على الشاشة، شاشة كاملة من غير شريط المتصفح، ووضع أفقي.

**أوفلاين:** هيكل التطبيق بيتخزّن وقت التسطيب (خفيف ~٢٦٠ كيلوبايت)، والصور والأصوات بتتخزّن أول ما تفتح القصة — فأي قصة سمعتها مرة بتشتغل بعدها من غير نت.

```bash
npm run build     # ينتج dist/ جاهزة للنشر
npm run preview   # تجربة نسخة الإنتاج محليًا
```

## بنية المحتوى

**مصدر واحد للحقيقة:** كل نصوص القصص في [`src/data/stories.data.json`](src/data/stories.data.json) — التطبيق وسكربتات الصوت بيقروا منه، فمفيش احتمال إن النص والصوت يختلفوا.

| ملف | بيعمل إيه |
|---|---|
| `src/data/stories.data.json` | نصوص القصص (المصدر الوحيد) |
| `src/data/stories.ts` | الأنواع + بناء الحقول المشتقّة (مسارات الصوت، نص الصفحة) |
| `scripts/voices.json` | أصوات edge-tts للعربي |
| `scripts/voices.11labs.json` | كاست ElevenLabs للإنجليزي |

مسارات الصوت متولّدة تلقائيًا بالنمط `/audio/<story-id>/<page>-s<index>-<lang>.mp3` — يعني أي ملف صوت (مولّد أو **تسجيل بشري**) بيشتغل فورًا لو اتسمّى بنفس النمط.

## توليد الأصوات

كل السكربتات بتقرا من نفس مصدر المحتوى.

### الإنجليزي — ElevenLabs (`eleven_v3`)

```bash
export ELEVENLABS_API_KEY=...
python scripts/generate_audio_11labs_en.py            # كل القصص
python scripts/generate_audio_11labs_en.py --only pip-learns-to-share
python scripts/generate_words_11labs_en.py            # نطق الكلمات
```

المشاعر متظبّطة لكل مود (متحمّس/حزين/هادي…)، والسرعة `0.85` (إيقاع هادي مناسب للأطفال).

### أصوات أطفال (رفع الطبقة)

ElevenLabs مافيهوش تحكم في طبقة الصوت، فالشخصيات بتطلع كبار. السكربت ده بيرفع الطبقة للشخصيات الصغيرة **من غير ما يغيّر السرعة** (الراوي وماما بيفضلوا كبار عن قصد):

```bash
python scripts/childify_en.py --factor 1.18            # القصص
python scripts/childify_en.py --words --factor 1.18    # نطق الكلمات
python scripts/childify_en.py --test                   # عينات للمقارنة
```

الأصل بيتحفظ في `audio-backup/` — فتغيير الطبقة بيتم في ثواني من غير ما تدفع تاني.

### العربي — edge-tts (أصوات مصرية)

```bash
pip install edge-tts
python scripts/generate_audio.py --only pip-learns-to-share
```

`ar-EG-SalmaNeural` و`ar-EG-ShakirNeural` — مصري حقيقي.

## إضافة قصة جديدة

1. صور في `public/stories/<slug>/`
2. القصة (نصوص + مشاعر) في `src/data/stories.data.json`
3. أسئلة الآخر في `quiz` جوه نفس القصة (تحت)
4. أصوات الشخصيات في `scripts/voices.json` و`scripts/voices.11labs.json`
5. شغّل سكربتات التوليد
6. راجع النطق بالسمع

### شكل `quiz`

سؤالين لكل قصة — واحد `image` وواحد `word`. سؤال الصور بيشاور على `page` من نفس
القصة (الصور اللي الطفل شافها فعلًا)، وسؤال الكلمة لازم كلماته تكون **موجودة في
`public/audio/words/manifest.json`** عشان تتنطق لما الطفل يدوس عليها.

```json
"quiz": [
  {
    "type": "image",
    "en": "Which picture shows Pip sharing the red ball?",
    "ar": "أنهي صورة فيها بيب بيدّي الكورة الحمرا لميمي؟",
    "options": [{ "page": "p5", "correct": true }, { "page": "p4" }, { "page": "p1" }]
  },
  {
    "type": "word",
    "en": "What makes friends happy?",
    "ar": "إيه اللي بيفرّح الأصحاب؟",
    "options": [
      { "word": "sharing", "emoji": "🤝", "correct": true },
      { "word": "mine", "emoji": "✊" },
      { "word": "no", "emoji": "🙅" }
    ]
  }
]
```

سكربتات الصوت بتقرا `pages` بس، فإضافة `quiz` مابتأثرش على توليد الأصوات.

## التقنيات

React 19 · TypeScript · Vite · vite-plugin-pwa (Workbox)

## Native Android app

The `android/` project is a Capacitor wrapper with all web, story, image, and
audio assets bundled into the APK. It uses Android System WebView and does not
open or require Chrome.

Requirements: JDK 21 and Android SDK Platform/Build Tools 35.

```bash
npm run android:sync
cd android
./gradlew assembleRelease
```

The installable release is copied to `public/StoryGarden.apk` for the website's
download button.
