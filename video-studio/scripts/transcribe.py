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
    ap.add_argument("--ranges", default=None, help="JSON [[in,out],...]: transcribe sólo esas tomas, cada una por separado (selects)")
    ap.add_argument("--chunk", type=float, default=0, help="transcribir en bloques de N s (evita que Whisper se salte tramos en el QC)")
    ap.add_argument("--prompt", default="Vocare Iuris. Derecho peruano: Indecopi, SBS, Constitución, Código Penal, Ley N.°")
    a = ap.parse_args()

    from faster_whisper import WhisperModel

    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    audio = load_audio(a.input)
    if a.ranges:
        sr = 16000
        rng = json.load(open(a.ranges))
        words, segments = [], []
        for k, (r_in, r_out) in enumerate(rng):
            pad = 0.6 if (r_out - r_in) < 1.5 else 0.35  # tomas cortas: más contexto para Whisper
            st = max(0.0, r_in - pad)
            part = audio[int(st * sr) : int((r_out + pad) * sr)]
            segs_r, _ = model.transcribe(part, language=a.lang, word_timestamps=True, vad_filter=False, initial_prompt=a.prompt, condition_on_previous_text=False)
            for sg in segs_r:
                segments.append({"start": round(sg.start + st, 3), "end": round(sg.end + st, 3), "text": sg.text.strip(), "take": k})
                for w in sg.words or []:
                    ws, we = w.start + st, w.end + st
                    # pertenece a la toma si TERMINA dentro de ella (Whisper adelanta el inicio de la 1.ª palabra)
                    if we > r_in + 0.06 and ws < r_out - 0.04:
                        words.append({"w": w.word.strip(), "s": round(max(ws, r_in - 0.1), 3), "e": round(min(we, r_out + 0.2), 3), "p": round(w.probability, 3), "take": k})
        out = {"model": a.model, "language": a.lang, "duration": round(len(audio) / sr, 3), "text": " ".join(x["text"] for x in segments), "segments": segments, "words": words}
        with open(a.output, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print(f"transcripción por tomas: {len(rng)} tomas, {len(words)} palabras → {a.output}", file=sys.stderr)
        return
    if a.chunk > 0:
        sr = 16000
        n = int(a.chunk * sr)
        words, segments = [], []
        for k in range(0, len(audio), n):
            part = audio[k : k + n + sr // 2]  # medio segundo de solape
            if k > 0 and len(part) < sr:  # cola < 1 s: ya cubierta por el solape del bloque anterior
                continue
            off = k / sr
            segs_c, _ = model.transcribe(part, language=a.lang, word_timestamps=True, vad_filter=False, initial_prompt=a.prompt, condition_on_previous_text=False)
            for sg in segs_c:
                segments.append({"start": round(sg.start + off, 3), "end": round(sg.end + off, 3), "text": sg.text.strip()})
                for w in sg.words or []:
                    if w.start + off >= (k / sr) - 0.01 and (k == 0 or w.start >= 0.25):
                        words.append({"w": w.word.strip(), "s": round(w.start + off, 3), "e": round(w.end + off, 3), "p": round(w.probability, 3)})
        out = {"model": a.model, "language": a.lang, "duration": round(len(audio) / sr, 3), "text": " ".join(x["text"] for x in segments), "segments": segments, "words": words}
        with open(a.output, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print(f"transcripción por bloques: {len(words)} palabras → {a.output}", file=sys.stderr)
        return
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
