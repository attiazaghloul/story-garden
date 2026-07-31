"""
Generate multi-character story audio + shared word packs.

  python scripts/generate_audio.py
  python scripts/generate_audio.py --only nour-names-feelings
  python scripts/generate_audio.py --new-only
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from stories_catalog import STORIES  # noqa: E402

WORDS_OUT = ROOT / "public" / "audio" / "words"
PAUSE_MS = 280

MOOD = {
    "warm": {"rate": 0, "pitch": 0},
    "happy": {"rate": 6, "pitch": 6},
    "excited": {"rate": 10, "pitch": 10},
    "sad": {"rate": -12, "pitch": -8},
    "gentle": {"rate": -8, "pitch": 2},
    "kind": {"rate": -4, "pitch": 4},
    "curious": {"rate": 2, "pitch": 6},
    "calm": {"rate": -10, "pitch": 0},
    "proud": {"rate": 2, "pitch": 4},
}

NEW_IDS = {
    "nour-names-feelings",
    "zuzu-counts",
    "riri-colors",
    "tito-helps",
    "brushy-teeth",
    "kiko-waits",
    "lulu-says-sorry",
}

_AR_PUNCT = "،؛؟ـ.…!؟٬٫«»\"'()[]{}،"


def parse_pct(value: str) -> int:
    return int(value.replace("%", "").replace("Hz", "").replace("+", ""))


def format_rate(n: int) -> str:
    return f"{n:+d}%"


def format_pitch(n: int) -> str:
    return f"{n:+d}Hz"


def voice_params(cast: dict, lang: str, speaker: str, mood: str) -> tuple[str, str, str]:
    base = cast[lang][speaker]
    m = MOOD.get(mood, MOOD["warm"])
    rate = max(-50, min(50, parse_pct(base["rate"]) + m["rate"]))
    pitch = max(-50, min(50, parse_pct(base["pitch"]) + m["pitch"]))
    return base["voice"], format_rate(rate), format_pitch(pitch)


def tokenize_words(text: str, lang: str) -> list[str]:
    if lang == "en":
        return re.findall(r"[A-Za-z']+", text)
    raw = re.findall(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+", text)
    cleaned: list[str] = []
    for w in raw:
        w2 = re.sub(r"[،؛؟ـ.…!؟٬٫]+", "", w.strip(_AR_PUNCT))
        if w2:
            cleaned.append(w2)
    return cleaned


def word_key(lang: str, word: str) -> str:
    raw = word.strip().lower() if lang == "en" else word.strip()
    return hashlib.sha1(f"{lang}:{raw}".encode("utf-8")).hexdigest()[:16]


async def save_mp3(text: str, voice: str, path: Path, rate: str, pitch: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(str(path))
    print(f"  OK  {path.relative_to(ROOT)}  ({path.stat().st_size // 1024} KB)")


async def generate_story(story: dict, word_jobs: dict, words_map: dict) -> None:
    story_id = story["id"]
    cast = story["cast"]
    out = ROOT / "public" / "audio" / story_id
    out.mkdir(parents=True, exist_ok=True)
    print(f"\n======== STORY: {story_id} ========")
    for page in story["pages"]:
        for idx, seg in enumerate(page["segments"]):
            speaker = seg["speaker"]
            mood = seg["mood"]
            for lang in ("en", "ar"):
                text = seg[lang]
                voice, rate, pitch = voice_params(cast, lang, speaker, mood)
                path = out / f"{page['id']}-s{idx}-{lang}.mp3"
                print(f"\n[{story_id} {page['id']} #{idx} {speaker}/{mood}/{lang}] {text}")
                await save_mp3(text, voice, path, rate, pitch)
                for w in tokenize_words(text, lang):
                    display = w.lower() if lang == "en" else w
                    key = word_key(lang, display)
                    words_map[lang][display] = f"{key}.mp3"
                    word_jobs[(lang, display)] = key


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="")
    parser.add_argument("--new-only", action="store_true")
    parser.add_argument("--skip-words", action="store_true")
    args = parser.parse_args()

    selected = STORIES
    if args.only:
        selected = [s for s in STORIES if s["id"] == args.only]
        if not selected:
            raise SystemExit(f"Unknown story: {args.only}")
    elif args.new_only:
        selected = [s for s in STORIES if s["id"] in NEW_IDS]

    word_jobs: dict[tuple[str, str], str] = {}
    words_map: dict[str, dict[str, str]] = {"en": {}, "ar": {}}
    existing = WORDS_OUT / "manifest.json"
    if existing.exists():
        try:
            prev = json.loads(existing.read_text(encoding="utf-8"))
            for lang in ("en", "ar"):
                for w, path in (prev.get(lang) or {}).items():
                    fn = Path(path).name
                    words_map[lang][w] = fn
                    word_jobs[(lang, w)] = fn.replace(".mp3", "")
        except Exception:
            pass

    for story in selected:
        await generate_story(story, word_jobs, words_map)

    if not args.skip_words:
        print("\n=== Word pronunciation pack ===")
        (WORDS_OUT / "en").mkdir(parents=True, exist_ok=True)
        (WORDS_OUT / "ar").mkdir(parents=True, exist_ok=True)
        for (lang, display), key in sorted(word_jobs.items(), key=lambda x: (x[0][0], x[0][1])):
            out = WORDS_OUT / lang / f"{key}.mp3"
            if out.exists() and out.stat().st_size > 800:
                continue
            if lang == "en":
                voice, rate, pitch = "en-US-AnaNeural", "-22%", "+8Hz"
            else:
                voice, rate, pitch = "ar-EG-SalmaNeural", "-18%", "+14Hz"
            print(f"\n[word {lang}] {display}")
            await save_mp3(display, voice, out, rate, pitch)

        words_manifest = {
            "en": {w: f"/audio/words/en/{fn}" for w, fn in words_map["en"].items()},
            "ar": {w: f"/audio/words/ar/{fn}" for w, fn in words_map["ar"].items()},
        }
        (WORDS_OUT / "manifest.json").write_text(
            json.dumps(words_manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
