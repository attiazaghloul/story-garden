"""Story catalog for TTS generation.

Single source of truth: story content lives in ``src/data/stories.data.json``
(the same file the React app imports). Per-character voice settings live in
``scripts/voices.json``. This module just joins the two into the ``STORIES``
shape that ``generate_audio.py`` consumes, so text can never drift between the
app and the audio pipeline.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_HERE = Path(__file__).resolve().parent

_content = json.loads(
    (ROOT / "src" / "data" / "stories.data.json").read_text(encoding="utf-8")
)
_voices = json.loads((_HERE / "voices.json").read_text(encoding="utf-8"))


def _build(story: dict) -> dict:
    story_id = story["id"]
    if story_id not in _voices:
        raise SystemExit(
            f"Missing voice config for '{story_id}' in scripts/voices.json"
        )
    return {
        "id": story_id,
        "cast": _voices[story_id],
        "pages": story["pages"],
    }


STORIES = [_build(s) for s in _content]
