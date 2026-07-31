"""Regenerate the ENGLISH tap-a-word pronunciation pack with ElevenLabs (v3).

Keeps the exact filenames the app's word manifest already points to
(public/audio/words/en/<hash>.mp3), so useWordAudioMap keeps working. Uses one
clear voice (George, the narrator) for consistency, at a calm pace.

Usage:
  set ELEVENLABS_API_KEY=...
  python scripts/generate_words_11labs_en.py
  python scripts/generate_words_11labs_en.py --skip-existing
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL = "eleven_v3"
OUTPUT_FORMAT = "mp3_44100_128"
VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"  # George (narrator) — consistent, clear
SPEED = 0.90                       # single words: clear, unrushed

KEY = os.environ.get("ELEVENLABS_API_KEY")
if not KEY:
    raise SystemExit("Set ELEVENLABS_API_KEY in the environment first.")

WORDS_DIR = ROOT / "public" / "audio" / "words"
MANIFEST = WORDS_DIR / "manifest.json"

SETTINGS = {
    "stability": 0.50,
    "similarity_boost": 0.80,
    "style": 0.15,
    "use_speaker_boost": True,
    "speed": SPEED,
}

# Standalone "I" can be interpreted as the Roman numeral one by TTS models.
# The homophone keeps the clip sounding correct while removing that ambiguity.
PRONUNCIATION_HINTS = {
    "i": "eye",
}


def synthesize(text: str, retries: int = 2) -> bytes:
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS}).encode("utf-8")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format={OUTPUT_FORMAT}"
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
            if e.code in (401, 402):
                raise SystemExit(f"\nFATAL {e.code}: {detail[:200]}")
            if attempt < retries and e.code in (429, 500, 502, 503):
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{e.code} {detail[:160]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    en_words = manifest.get("en", {})
    print(f"English words: {len(en_words)}")

    made = 0
    total_chars = 0
    for word, rel_path in sorted(en_words.items()):
        filename = Path(rel_path).name
        out = WORDS_DIR / "en" / filename
        if args.skip_existing and out.exists() and out.stat().st_size > 800:
            continue
        data = synthesize(PRONUNCIATION_HINTS.get(word, word))
        out.write_bytes(data)
        made += 1
        total_chars += len(word)
        if made % 25 == 0:
            print(f"  ... {made} words done")

    print(f"\nDone. Regenerated {made} English word clips. Characters billed ~{total_chars}.")


if __name__ == "__main__":
    main()
