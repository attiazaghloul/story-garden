# Story Garden · حديقة القصص

تطبيق قصص أطفال تعليمي لسن **٤–٦ سنين** — يتسطّب على التابلت ويشتغل من غير نت.

- **١٠ قصص**، كل قصة ليها هدف تعليمي واضح (المشاركة، الصبر، الاعتذار، المشاعر، العدّ…)
- **لغة واحدة في الجلسة**: عربي مصري **أو** إنجليزي أمريكي (مش الاتنين مع بعض، عشان الطفل مايتشتتش)
- نصوص عربية مصرية أصلية (مش ترجمة حرفية)
- **أصوات مخزّنة جوه التطبيق** بمشاعر لكل مشهد — مش أصوات المتصفح
- **دوس على أي كلمة** تسمع نطقها
- تحكم في سرعة القراءة

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
3. أصوات الشخصيات في `scripts/voices.json` و`scripts/voices.11labs.json`
4. شغّل سكربتات التوليد
5. راجع النطق بالسمع

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
