"""Generate ENGLISH story audio with ElevenLabs (eleven_v3, richer emotion).

Reads the single source of truth (src/data/stories.data.json) and the English
voice cast (scripts/voices.11labs.json), then writes one MP3 per segment to
public/audio/<story-id>/<page>-s<idx>-en.mp3 — the same paths the app already
expects, so no app changes are needed. Arabic audio (edge-tts) is untouched.

Usage:
  set ELEVENLABS_API_KEY=...            (PowerShell: $env:ELEVENLABS_API_KEY="...")
  python scripts/generate_audio_11labs_en.py                 # all stories
  python scripts/generate_audio_11labs_en.py --only pip-learns-to-share
  python scripts/generate_audio_11labs_en.py --skip-existing # resume after a stop
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
MODEL = "eleven_v3"
OUTPUT_FORMAT = "mp3_44100_128"
# Slower pace for ages 4–6 (range 0.7–1.2; 1.0 = default). Lower = calmer/slower.
SPEED = 0.85

KEY = os.environ.get("ELEVENLABS_API_KEY")
if not KEY:
    raise SystemExit("Set ELEVENLABS_API_KEY in the environment first.")

STORIES = json.loads((ROOT / "src" / "data" / "stories.data.json").read_text(encoding="utf-8"))
VOICES = json.loads((HERE / "voices.11labs.json").read_text(encoding="utf-8"))["voices"]

# mood -> (stability, style). Lower stability + higher style = more expressive.
MOOD_SETTINGS = {
    "excited": (0.28, 0.60),
    "happy": (0.32, 0.55),
    "proud": (0.35, 0.50),
    "sad": (0.35, 0.50),
    "curious": (0.38, 0.45),
    "kind": (0.42, 0.40),
    "warm": (0.45, 0.35),
    "gentle": (0.45, 0.35),
    "calm": (0.50, 0.30),
}


def settings_for(mood: str) -> dict:
    stability, style = MOOD_SETTINGS.get(mood, (0.45, 0.35))
    return {
        "stability": stability,
        "similarity_boost": 0.80,
        "style": style,
        "use_speaker_boost": True,
        "speed": SPEED,
    }


def synthesize(voice_id: str, text: str, settings: dict, retries: int = 2) -> bytes:
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": settings}).encode("utf-8")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format={OUTPUT_FORMAT}"
    req = urllib.request.Request(
        url,
        data=body,
        headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")
            # Quota / auth errors are fatal — stop the whole run.
            if e.code in (401, 402):
                raise SystemExit(f"\nFATAL {e.code}: {detail[:200]}")
            if attempt < retries and e.code in (429, 500, 502, 503):
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{e.code} {detail[:160]}")
        except urllib.error.URLError:
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            raise


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    selected = STORIES
    if args.only:
        selected = [s for s in STORIES if s["id"] == args.only]
        if not selected:
            raise SystemExit(f"Unknown story: {args.only}")

    total_chars = 0
    made = 0
    skipped = 0
    for story in selected:
        story_id = story["id"]
        out_dir = ROOT / "public" / "audio" / story_id
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n======== {story_id} (English, {MODEL}) ========")
        for page in story["pages"]:
            for idx, seg in enumerate(page["segments"]):
                speaker = seg["speaker"]
                text = seg["en"]
                voice = VOICES.get(speaker)
                if not voice:
                    print(f"  !! no voice for speaker '{speaker}' — skipped")
                    continue
                path = out_dir / f"{page['id']}-s{idx}-en.mp3"
                if args.skip_existing and path.exists() and path.stat().st_size > 800:
                    skipped += 1
                    continue
                settings = settings_for(seg["mood"])
                data = synthesize(voice["voice_id"], text, settings)
                path.write_bytes(data)
                total_chars += len(text)
                made += 1
                print(f"  OK  {path.name:<14} {speaker:<9}/{seg['mood']:<8} "
                      f"{voice['name']:<8} {len(data)//1024:>3} KB  | {text}")

    print(f"\nDone. Generated {made}, skipped {skipped}. Characters billed ~{total_chars}.")


if __name__ == "__main__":
    main()
