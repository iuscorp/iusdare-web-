#!/usr/bin/env python3
"""
SNAP CUTS — mueve cada in/out de segmento al punto más silencioso entre palabras.

  python3 -I scripts/snap_cuts.py <slug> [--dry-run]
  (npm run studio:snap -- <slug>)

Por qué: los tiempos de palabra de Whisper terminan antes que la cola real de
la sílaba (sibilantes como la "s" final de "startups"). Cortar en w.e la
recorta. Este paso:
  - out: busca el mínimo de energía entre el fin de la última palabra (+0.12 s)
         y el inicio de la siguiente (−0.04 s); nunca antes de fin+0.12 s.
  - in:  busca el mínimo entre el fin de la palabra previa y el inicio de la
         primera palabra (−0.08 s).
Respeta `framing`/roles; solo toca tiempos. Segmentos con "lockIn"/"lockOut"
en true no se mueven (p. ej. para esquivar fotogramas negros del raw).
"""
import json
import subprocess
import sys

import numpy as np

slug = sys.argv[1]
dry = "--dry-run" in sys.argv
P = f"projects/{slug}/edit.json"
edit = json.load(open(P, encoding="utf-8"))
words_by_src = {}
for sid, rel in edit["sources"].items():
    tpath = f"projects/{slug}/analysis/transcript-{sid}.json"
    try:
        words_by_src[sid] = json.load(open(tpath, encoding="utf-8"))["words"]
    except FileNotFoundError:
        words_by_src[sid] = []

SR = 16000
HOP = 0.01


def envelope(rel):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", f"public/{rel}", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, stdout=subprocess.PIPE,
    ).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    h = int(SR * HOP)
    n = len(a) // h
    rms = np.sqrt((a[: n * h].reshape(n, h) ** 2).mean(axis=1) + 1e-12)
    # 30 ms smoothing
    k = np.ones(3) / 3
    return np.convolve(rms, k, mode="same")


envs = {sid: envelope(rel) for sid, rel in edit["sources"].items()}


def quietest(env, a, b):
    ia, ib = max(0, int(a / HOP)), min(len(env) - 1, int(b / HOP))
    if ib <= ia:
        return None
    i = ia + int(np.argmin(env[ia : ib + 1]))
    return round(i * HOP, 3)


# Boundaries shared by segments that are contiguous in the raw (out of one ==
# in of the next, same source) are NOT a cut: leave them untouched.
segs = edit["segments"]
shared = set()
for a in segs:
    for b in segs:
        if a is not b and a.get("source", "main") == b.get("source", "main") and abs(a["out"] - b["in"]) < 0.05:
            shared.add((id(a), "out"))
            shared.add((id(b), "in"))

report = []
for s in edit["segments"]:
    W = words_by_src.get(s.get("source", "main"), [])
    env = envs[s.get("source", "main")]
    if not W:
        continue
    old_in, old_out = s["in"], s["out"]
    # OUT: last word that starts inside the segment
    # words that start inside the segment, excluding one that only grazes the out point
    inside = [w for w in W if old_in - 0.05 <= w["s"] < old_out - 0.03]
    if inside and not s.get("lockOut") and (id(s), "out") not in shared:
        last = inside[-1]
        nxt = next((w for w in W if w["s"] >= last["e"] - 0.01 and w is not last and w["s"] > last["s"]), None)
        hi = (nxt["s"] - 0.04) if nxt else last["e"] + 0.6
        hi = min(hi, last["e"] + 0.6)
        lo = last["e"] + 0.12
        if hi > lo:
            t = quietest(env, lo, hi)
            s["out"] = t if t else round(lo, 3)
        else:  # words touch: keep as far as possible without entering next word
            s["out"] = round(max(old_out, hi), 3)
    # IN: first word of segment
    if inside and not s.get("lockIn") and (id(s), "in") not in shared:
        first = inside[0]
        prev = [w for w in W if w["e"] <= first["s"] + 0.01 and w["s"] < first["s"]]
        lo = (prev[-1]["e"] + 0.04) if prev else max(0, first["s"] - 0.5)
        lo = max(lo, first["s"] - 0.5)
        hi = first["s"] - 0.08
        if hi > lo:
            t = quietest(env, lo, hi)
            s["in"] = t if t is not None else round(hi, 3)
        else:
            s["in"] = round(max(0, min(old_in, first["s"] - 0.03)), 3)
    report.append((s["id"], old_in, s["in"], old_out, s["out"], inside[-1]["w"] if inside else ""))

for r in report:
    print(f"{r[0]}: in {r[1]:.2f}→{r[2]:.2f}   out {r[3]:.2f}→{r[4]:.2f}   (última palabra: {r[5]})")
if not dry:
    json.dump(edit, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✔ {P} actualizado")
