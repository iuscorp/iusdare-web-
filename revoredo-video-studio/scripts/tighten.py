#!/usr/bin/env python3
"""
TIGHTEN — deja SOLO la voz de la persona en pantalla, sin silencios.

  python3 -I scripts/tighten.py <slug> [--min-f0 150] [--max-gap 0.22] [--pad 0.06] [--dry-run]
  (npm run studio:tighten -- <slug>)

Regla del estudio (obligatoria): se elimina SIEMPRE
  1. todo silencio interno de más de --max-gap segundos, y
  2. toda voz fuera de cámara (director que dicta, preguntas, comentarios).

Cómo:
  - Detecta islas de voz por energía (−42 dB) dentro de cada segmento.
  - Estima el tono (pYIN) de cada isla: por debajo de --min-f0 Hz se
    considera voz fuera de cámara y se descarta. Ajustar --min-f0 al caso
    (p. ej. presentador hombre con directora mujer → usar --max-f0).
  - Divide el segmento en sub-segmentos (Sxx.a, Sxx.b…) con --pad de aire, y
    alterna la escala ±4 % en cada micro-corte para disimular el salto.
  - Gráficos, B-roll y subtítulos están anclados al tiempo del raw, así que
    siguen a la voz automáticamente (usar `revealAtSource` en listas).
Segmentos con "keepVoice": true no se filtran por tono (p. ej. final de frase con voz
grave verificado a mano). Escribe el EDL (backup en edit.before-tighten.json).
"""
import argparse
import copy
import json
import subprocess

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("slug")
ap.add_argument("--min-f0", type=float, default=150)
ap.add_argument("--max-f0", type=float, default=0, help="si >0, descarta voces POR ENCIMA (presentador grave)")
ap.add_argument("--max-gap", type=float, default=0.22)
ap.add_argument("--pad", type=float, default=0.06)
ap.add_argument("--thresh-db", type=float, default=-42)
ap.add_argument("--dry-run", action="store_true")
a = ap.parse_args()

P = f"projects/{a.slug}/edit.json"
edit = json.load(open(P, encoding="utf-8"))
SR = 16000
HOP = 160  # 10 ms


def load(rel):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", f"public/{rel}", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, stdout=subprocess.PIPE,
    ).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


audio = {sid: load(rel) for sid, rel in edit["sources"].items()}
f0cache = {}


def f0_of(sid, t0, t1):
    import librosa  # pip install librosa

    y = audio[sid][int(t0 * SR) : int(t1 * SR)]
    if len(y) < 2048:
        return 0.0
    f0, _, _ = librosa.pyin(y, fmin=70, fmax=400, sr=SR, frame_length=1024, hop_length=HOP)
    f0 = f0[~np.isnan(f0)]
    return float(np.median(f0)) if len(f0) > 5 else 0.0


def islands(sid, t0, t1):
    y = audio[sid][int(t0 * SR) : int(t1 * SR)]
    n = len(y) // HOP
    if n == 0:
        return []
    en = 20 * np.log10(np.sqrt((y[: n * HOP].reshape(n, HOP) ** 2).mean(1)) + 1e-9)
    sp = en > a.thresh_db
    out, i = [], 0
    gap = int(a.max_gap * 100)
    while i < n:
        if sp[i]:
            j = i
            while j < n and (sp[j] or sp[j : j + gap].any()):
                j += 1
            if j - i >= 6:  # ≥ 60 ms
                out.append((t0 + i / 100, t0 + j / 100))
            i = j
        else:
            i += 1
    return out


new, report = [], []
for s in edit["segments"]:
    sid = s.get("source", "main")
    isl = islands(sid, s["in"], s["out"])
    kept = []
    for (x0, x1) in isl:
        f0 = f0_of(sid, x0, x1)
        off = not s.get("keepVoice") and ((0 < f0 < a.min_f0) or (a.max_f0 > 0 and f0 > a.max_f0))
        report.append(f"{s['id']}: {x0:7.2f}-{x1:7.2f}  F0 {f0:5.0f} Hz  {'✖ fuera de cámara' if off else '✔'}")
        if not off:
            kept.append((max(s["in"], x0 - a.pad), min(s["out"], x1 + a.pad)))
    # merge overlaps after padding
    merged = []
    for k in kept:
        if merged and k[0] <= merged[-1][1] + 0.01:
            merged[-1] = (merged[-1][0], max(merged[-1][1], k[1]))
        else:
            merged.append(k)
    for i, (x0, x1) in enumerate(merged):
        n = copy.deepcopy(s)
        n["id"] = s["id"] if len(merged) == 1 else f"{s['id']}.{chr(97 + i)}"
        n["in"], n["out"] = round(x0, 3), round(x1, 3)
        if i > 0:
            n["transitionIn"] = "cut"
            fr = n.setdefault("framing", {})
            # alternate a 4 % scale step on every micro-cut
            bump = 1.04 if i % 2 == 1 else 1.0
            fr["zoomFrom"] = round(fr.get("zoomFrom", 1) * bump, 3)
            fr["zoomTo"] = round(fr.get("zoomTo", 1) * bump, 3)
            n["rationale"] = (n.get("rationale", "") + " · micro-corte de silencio").strip(" ·")
        new.append(n)

before = sum(s["out"] - s["in"] for s in edit["segments"])
after = sum(s["out"] - s["in"] for s in new)
print("\n".join(report))
print(f"\nSegmentos {len(edit['segments'])} → {len(new)} · duración {before:.1f} s → {after:.1f} s")
if not a.dry_run:
    json.dump(edit, open(P.replace("edit.json", "edit.before-tighten.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    edit["segments"] = new
    json.dump(edit, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✔ {P} (backup: edit.before-tighten.json)")
