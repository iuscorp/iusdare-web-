#!/usr/bin/env python3
"""
CLEAN VOICE — elimina voces y ruido de fondo, deja solo la voz en primer plano.

  python3 -I scripts/clean_voice.py <slug> [--source main] [--thresh -44] [--floor -32]
  (npm run studio:clean -- <slug>)

Cadena (sobre el audio del raw, el video se copia sin recomprimir):
  0. (Si hay modelo) DeepFilterNet3 a 48 kHz: realce de voz por red neuronal (ruido,
     ambiente, reverberación). Modelo: --dfn <dir> o $DFN_MODEL_DIR, carpeta con
     config.ini + model.safetensors (Hugging Face fal/DeepFilterNet3, Apache-2.0).
     Requiere: pip install torch deepfilternet safetensors.
  1. High-pass 85 Hz (rumble, aire acondicionado).
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
ap.add_argument("--floor", type=float, default=-60)
ap.add_argument("--hold", type=int, default=2, help="hold en bloques de 10 ms")
ap.add_argument("--nr", type=float, default=20)
ap.add_argument("--dfn", default=os.environ.get("DFN_MODEL_DIR", ""), help="carpeta del modelo DeepFilterNet3")
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


def deepfilter(model_dir, inp, out):
    """Stage 0: neural speech enhancement (DeepFilterNet3). Returns True if applied."""
    import sys
    import types

    try:
        import torch
        import torchaudio  # noqa: F401
    except ImportError:
        return False
    try:
        import torchaudio.backend.common  # noqa: F401
    except Exception:  # torchaudio ≥2.2 removed the module deepfilternet still imports
        m, c = types.ModuleType("torchaudio.backend"), types.ModuleType("torchaudio.backend.common")
        c.AudioMetaData = type("AudioMetaData", (), {})
        m.common = c
        sys.modules["torchaudio.backend"], sys.modules["torchaudio.backend.common"] = m, c
    ck = os.path.join(model_dir, "checkpoints", "model_120.ckpt.best")
    if not os.path.exists(ck):
        from safetensors.torch import load_file

        os.makedirs(os.path.dirname(ck), exist_ok=True)
        torch.save(load_file(os.path.join(model_dir, "model.safetensors")), ck)
    from df.enhance import enhance, init_df

    model, state, _ = init_df(model_base_dir=model_dir, log_level="ERROR")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", inp, "-vn", "-ac", "1", "-ar", str(state.sr()), "-f", "f32le", "-"],
                         check=True, stdout=subprocess.PIPE, stdin=subprocess.DEVNULL).stdout
    x = torch.from_numpy(np.frombuffer(raw, np.float32).copy())[None]
    y = enhance(model, state, x)[0].numpy().astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(state.sr()), "-ac", "1", "-i", "-", "-c:a", "pcm_f32le", out],
                   input=y.tobytes(), check=True)
    return True


stage_in = src
dfn_wav = f"public/{rel}.dfn.wav"
if a.dfn and os.path.isdir(a.dfn) and deepfilter(a.dfn, src, dfn_wav):
    stage_in = dfn_wav
    print("• DeepFilterNet3 aplicado")
else:
    print("• DeepFilterNet3 no disponible (usa --dfn <dir>); sigo con filtros clásicos")

# 1+2: high-pass + spectral denoise (mono voice)
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", stage_in, "-vn", "-ac", "1", "-ar", str(SR),
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
if os.path.exists(dfn_wav):
    os.remove(dfn_wav)
edit["sources"][a.source] = out_rel
json.dump(edit, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
closed = 100 * (1 - open_.mean())
print(f"✔ public/{out_rel} · compuerta cerrada {closed:.0f}% del tiempo · sources.{a.source} actualizado")
