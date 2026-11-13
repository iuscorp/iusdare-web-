#!/usr/bin/env python3
"""Quién habla, por la VOZ (tono + nivel), cada 0.1 s: P = presentador, u = otra voz, . = silencio.

Uso: voice-id.py <media> <salida.json> [--split-hz 165] [--quiet-db -33]
En sesiones con dictado detrás de cámara, la voz del presentador (micrófono) es más fuerte y, si
el tono difiere, se separa por F0. Complementa a speaker-activity.py (labios), que falla cuando
ambas voces se pisan o el presentador cierra la boca.
"""
import argparse, json, subprocess
import numpy as np

SR = 16000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("media"); ap.add_argument("out")
    ap.add_argument("--split-hz", type=float, default=165.0)
    ap.add_argument("--quiet-db", type=float, default=-33.0)
    a = ap.parse_args()
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.media, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, stdout=subprocess.PIPE).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    hop, win = int(0.02 * SR), int(0.04 * SR)
    f0, db = [], []
    lo, hi = int(SR / 400), int(SR / 70)
    w = np.hanning(win)
    for i in range(0, len(x) - win, hop):
        fr = x[i : i + win] * w
        r = float(np.sqrt(np.mean(fr**2)))
        db.append(20 * np.log10(r + 1e-9))
        if r < 0.01:
            f0.append(0.0); continue
        ac = np.correlate(fr, fr, "full")[win - 1 :]
        k = lo + int(np.argmax(ac[lo:hi]))
        f0.append(SR / k if ac[k] > 0.35 * ac[0] else 0.0)
    f0, db = np.array(f0), np.array(db)
    labels = []
    for t in np.arange(0, len(f0) * 0.02, 0.1):
        i0, i1 = int(t / 0.02), int((t + 0.1) / 0.02)
        F, D = f0[i0:i1], db[i0:i1]
        if len(D) == 0 or D.max() < -42:
            labels.append("."); continue
        v = F[F > 0]
        if len(v) == 0:
            labels.append("P" if D.max() > -30 else "."); continue
        labels.append("u" if (np.median(v) > a.split_hz or D.max() < a.quiet_db) else "P")
    json.dump({"step": 0.1, "labels": "".join(labels)}, open(a.out, "w"))
    print(f"voz: {labels.count('P')} P / {labels.count('u')} u (pasos de 0.1 s) → {a.out}")


if __name__ == "__main__":
    main()
