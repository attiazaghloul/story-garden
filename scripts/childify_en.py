"""Make the English character voices sound like children.

ElevenLabs exposes no pitch control, so its voices come out adult. The old
edge-tts pipeline got its child quality by raising pitch (+18..+32 Hz) for the
little characters. This script restores that: it pitch-shifts each generated
English clip up by a per-character factor, while keeping duration identical
(asetrate raises pitch and speed; atempo puts the speed back).

Narrator and the mama characters stay adult on purpose.

Usage:
  python scripts/childify_en.py --test          # a few samples into _pitchtest/
  python scripts/childify_en.py                 # process all English clips
  python scripts/childify_en.py --factor 1.15   # override the child factor
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100

STORIES = json.loads((ROOT / "src" / "data" / "stories.data.json").read_text(encoding="utf-8"))

# Characters that should sound grown-up. Everyone else is a little one.
ADULTS = {"narrator", "mama", "titoMama"}
# Slightly raised — a magical star, not a toddler.
SOFT = {"star": 1.06}

# Backups live outside public/ so they never ship in the production build.
BACKUP = ROOT / "audio-backup" / "_en_adult_backup"
WORDS_DIR = ROOT / "public" / "audio" / "words" / "en"
WORDS_BACKUP = ROOT / "audio-backup" / "_words_en_adult_backup"


def factor_for(speaker: str, child_factor: float) -> float:
    if speaker in ADULTS:
        return 1.0
    return SOFT.get(speaker, child_factor)


def shift(src: Path, dst: Path, factor: float) -> None:
    if abs(factor - 1.0) < 0.001:
        if src != dst:
            shutil.copyfile(src, dst)
        return
    af = f"asetrate={SR}*{factor},aresample={SR},atempo={1/factor:.6f}"
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", str(src), "-af", af,
           "-codec:a", "libmp3lame", "-b:a", "128k", str(dst)]
    subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--factor", type=float, default=1.12, help="pitch factor for child characters")
    ap.add_argument("--test", action="store_true", help="write a few samples for comparison only")
    ap.add_argument("--words", action="store_true", help="process the tap-a-word pack instead")
    args = ap.parse_args()

    if args.words:
        WORDS_BACKUP.mkdir(parents=True, exist_ok=True)
        clips = sorted(WORDS_DIR.glob("*.mp3"))
        for src in clips:
            bak = WORDS_BACKUP / src.name
            if not bak.exists():
                shutil.copyfile(src, bak)
            shift(bak, src, args.factor)
        print(f"Processed {len(clips)} word clips at x{args.factor}. "
              f"Originals kept in {WORDS_BACKUP}")
        return

    if args.test:
        out = ROOT / "public" / "audio" / "_pitchtest"
        out.mkdir(parents=True, exist_ok=True)
        samples = [
            ("pip-learns-to-share", "p2", 1, "pip"),
            ("pip-learns-to-share", "p4", 2, "mimi"),
            ("pip-learns-to-share", "p6", 1, "pip"),
        ]
        for story_id, page, idx, speaker in samples:
            src = ROOT / "public" / "audio" / story_id / f"{page}-s{idx}-en.mp3"
            for f in (1.10, 1.18):
                dst = out / f"{speaker}-{page}-s{idx}-x{int(f*100)}.mp3"
                shift(src, dst, f)
                print(f"OK  {dst.name}")
        print(f"\nTest clips in {out}")
        return

    # Full run — back up the untouched adult-pitch versions once.
    BACKUP.mkdir(parents=True, exist_ok=True)
    done = 0
    for story in STORIES:
        story_id = story["id"]
        story_dir = ROOT / "public" / "audio" / story_id
        bak_dir = BACKUP / story_id
        bak_dir.mkdir(parents=True, exist_ok=True)
        for page in story["pages"]:
            for idx, seg in enumerate(page["segments"]):
                name = f"{page['id']}-s{idx}-en.mp3"
                src = story_dir / name
                if not src.exists():
                    print(f"  !! missing {story_id}/{name}")
                    continue
                bak = bak_dir / name
                if not bak.exists():          # keep the original adult take
                    shutil.copyfile(src, bak)
                f = factor_for(seg["speaker"], args.factor)
                shift(bak, src, f)            # always derive from the untouched backup
                done += 1
        print(f"  {story_id}: done")
    print(f"\nProcessed {done} English clips. Originals kept in {BACKUP}")


if __name__ == "__main__":
    main()
