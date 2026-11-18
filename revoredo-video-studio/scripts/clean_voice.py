#!/usr/bin/env python3
"""
CLEAN VOICE — elimina voces y ruido de fondo, deja solo la voz en primer plano.

  python3 -I scripts/clean_voice.py <slug> [--source main] [--thresh -44] [--floor -32]
  (npm run studio:clean -- <slug>)

Cadena (sobre el audio del raw, el video se copia sin recomprimir):
  1. High-pass 80 Hz (rumble, aire acondicionado).
  2. Reducción espectral de ruido (ffmpeg afftdn, perfil adaptativo).
  3. Compuerta por envolvente: deja pasar solo la voz principal (nivel > --thresh dB)
     con hold 60 ms, ataque 5 ms y release 70 ms; fuera de ella atenúa --floor dB.
     Las voces de fondo (otras personas, a −50 dB) quedan bajo el umbral.
Escribe public/footage/raw/<slug>/<source>.clean.mp4 y apunta sources.<source> a él
(el original no se toca). Ejecutar después de `studio:tighten`.
"""
import argparse
import json
import os
import subprocess
import wave

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("slug")
ap.add_argument("--source", default="main")
ap.add_argument("--thresh", type=float, default=-41)
ap.add_argument("--floor", type=float, default=-45)
ap.add_argument("--hold", type=int, default=2, help="hold en bloques de 10 ms")
ap.add_argument("--nr", type=float, default=20)
a = ap.parse_args()

P = f"projects/{a.slug}/edit.json"
edit = json.load(open(P, encoding="utf-8"))
rel = edit["sources"][a.source]
if rel.endswith(".clean.mp4"):
    rel = rel.replace(".clean.mp4", ".mp4")
src = f"public/{rel}"
out_rel = rel.replace(".mp4", ".clean.mp4")
tmp_wav = f"public/{rel}.tmp.wav"
SR = 48000

# 1+2: high-pass + spectral denoise (mono voice)
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", str(SR),
     "-af", f"highpass=f=85,afftdn=nr={a.nr}:nf=-55:tn=1", "-c:a", "pcm_s16le", tmp_wav],
    check=True,
)
w = wave.open(tmp_wav)
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
w.close()

# 3: envelope gate
H = SR // 100  # 10 ms
n = len(x) // H
env = 20 * np.log10(np.sqrt((x[: n * H].reshape(n, H) ** 2).mean(1)) + 1e-9)
raw_open = env > a.thresh
hold = a.hold  # hold after the voice drops (dilation of the ORIGINAL mask)
open_ = raw_open.copy()
for k in range(1, hold + 1):
    open_[k:] |= raw_open[:-k]
open_[:-2] |= raw_open[2:]  # 20 ms look-ahead so consonant onsets are not clipped
g = np.where(open_, 1.0, 10 ** (a.floor / 20))
# smooth: attack 5 ms (fast), release 70 ms
att, rel_ = 1 - np.exp(-1 / 0.5), 1 - np.exp(-1 / 2.5)  # attack 5 ms, release 25 ms
sm = np.empty_like(g)
v = g[0]
for i in range(n):
    c = att if g[i] > v else rel_
    v += c * (g[i] - v)
    sm[i] = v
gain = np.repeat(sm, H)
gain = np.concatenate([gain, np.full(len(x) - len(gain), sm[-1])])
y = np.clip(x * gain, -1, 1)
with wave.open(tmp_wav, "wb") as o:
    o.setnchannels(1)
    o.setsampwidth(2)
    o.setframerate(SR)
    o.writeframes((y * 32767).astype(np.int16).tobytes())

subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", src, "-i", tmp_wav, "-map", "0:v:0", "-map", "1:a:0",
     "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ac", "2", "-shortest", "-movflags", "+faststart", f"public/{out_rel}"],
    check=True,
)
os.remove(tmp_wav)
edit["sources"][a.source] = out_rel
json.dump(edit, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
closed = 100 * (1 - open_.mean())
print(f"✔ public/{out_rel} · compuerta cerrada {closed:.0f}% del tiempo · sources.{a.source} actualizado")
