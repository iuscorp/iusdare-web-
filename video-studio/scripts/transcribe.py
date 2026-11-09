#!/usr/bin/env python3
"""Transcripción con marcas de tiempo por palabra (faster-whisper, CPU).

Uso: transcribe.py <audio.pcm|video> <salida.json> [--model small] [--lang es]

Se decodifica el audio con FFmpeg a PCM 16 kHz mono (evita depender de PyAV) y se pasa
como array a Whisper. Se guarda la probabilidad de cada palabra para que el QC pueda
señalar términos dudosos (nombres propios, números de ley, siglas).
"""
import argparse
import json
import subprocess
import sys

import numpy as np


def load_audio(path: str) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]
    raw = subprocess.run(cmd, check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", default="es")
    ap.add_argument("--prompt", default="Vocare Iuris. Derecho peruano: Indecopi, SBS, Constitución, Código Penal, Ley N.°")
    a = ap.parse_args()

    from faster_whisper import WhisperModel

    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    audio = load_audio(a.input)
    segs, info = model.transcribe(
        audio,
        language=a.lang,
        word_timestamps=True,
        vad_filter=False,  # queremos ver TODOS los silencios, la limpieza la decide el estudio
        initial_prompt=a.prompt,
        condition_on_previous_text=False,
    )
    words, segments = [], []
    for s in segs:
        segments.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip()})
        for w in s.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
    out = {
        "model": a.model,
        "language": info.language,
        "duration": round(len(audio) / 16000, 3),
        "text": " ".join(s["text"] for s in segments),
        "segments": segments,
        "words": words,
    }
    with open(a.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"transcripción: {len(words)} palabras → {a.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
