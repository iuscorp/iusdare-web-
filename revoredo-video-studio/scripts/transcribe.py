#!/usr/bin/env python3
"""
Word-level transcription for Revoredo Video Studio.

Usage:
  python3 -I scripts/transcribe.py <media> <out.json> [--model small] [--glossary brand/glossary.json]

- Uses faster-whisper (CPU, int8). Install once:  pip install faster-whisper
- Decodes audio with ffmpeg (16 kHz mono) and passes a numpy array, which
  avoids PyAV version issues.
- The glossary feeds Whisper an initial prompt (brand names, legal terms) and
  applies deterministic corrections afterwards (e.g. "reboreado" -> "Revoredo").
Output: { "language", "duration", "segments": [{start,end,text,words:[{w,s,e,p}]}], "words": [...] }
"""
import argparse
import json
import re
import subprocess
import sys

import numpy as np


def decode(path: str) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"]
    raw = subprocess.run(cmd, check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("out")
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", default="es")
    ap.add_argument("--glossary", default="brand/glossary.json")
    a = ap.parse_args()

    glossary = {"prompt_terms": [], "corrections": {}}
    try:
        with open(a.glossary, encoding="utf-8") as f:
            glossary.update(json.load(f))
    except FileNotFoundError:
        pass

    from faster_whisper import WhisperModel

    audio = decode(a.media)
    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    prompt = ", ".join(glossary.get("prompt_terms", [])) or None
    segs, info = model.transcribe(
        audio,
        language=a.language,
        word_timestamps=True,
        initial_prompt=prompt,
        vad_filter=False,
        # Avoids timestamp drift / repeated hallucinations on long takes.
        condition_on_previous_text=False,
    )

    corrections = {k.lower(): v for k, v in glossary.get("corrections", {}).items()}

    def fix(word: str) -> str:
        core = re.sub(r"^[¿¡\"'(]+|[.,;:!?\"')]+$", "", word)
        rep = corrections.get(core.lower())
        return word.replace(core, rep) if rep else word

    out_segments, words = [], []
    for s in segs:
        ws = [{"w": fix(w.word.strip()), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in (s.words or [])]
        out_segments.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": " ".join(x["w"] for x in ws), "words": ws})
        words.extend(ws)
        print(f"[{s.start:6.2f} → {s.end:6.2f}] {' '.join(x['w'] for x in ws)}", file=sys.stderr)

    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(
            {"language": info.language, "duration": round(len(audio) / 16000, 3), "segments": out_segments, "words": words},
            f,
            ensure_ascii=False,
            indent=1,
        )


if __name__ == "__main__":
    main()
