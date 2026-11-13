#!/usr/bin/env python3
"""Detección acústica fina de pausas dentro de los tramos montados.

Uso: tighten.py <media> <ranges.json> <salida.json> [--min-pause 0.14] [--drop-db 24]

Whisper "estira" las palabras sobre las pausas, así que la limpieza por palabras no ve el aire
que queda dentro. Aquí se mide la energía cada 10 ms y, para cada tramo, se marca como pausa
todo lo que esté --drop-db por debajo del nivel de voz del propio tramo (percentil 90) durante
al menos --min-pause s. Devuelve, por tramo: inicio/fin reales de la voz y las pausas internas.
"""
import argparse
import json
import subprocess

import numpy as np

SR = 16000
HOP = 0.01


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("ranges")
    ap.add_argument("out")
    ap.add_argument("--min-pause", type=float, default=0.14)
    ap.add_argument("--drop-db", type=float, default=24.0)
    a = ap.parse_args()
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.media, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, stdout=subprocess.PIPE).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    n = int(SR * HOP)
    frames = len(x) // n
    rms = np.sqrt(np.mean(x[: frames * n].reshape(frames, n) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    out = []
    for r_in, r_out in json.load(open(a.ranges)):
        i0, i1 = int(r_in / HOP), max(int(r_in / HOP) + 1, int(r_out / HOP))
        seg = db[i0:i1]
        if len(seg) < 5:
            out.append({"in": r_in, "out": r_out, "voiceIn": r_in, "voiceOut": r_out, "pauses": []})
            continue
        thr = float(np.percentile(seg, 90)) - a.drop_db
        voiced = seg > thr
        idx = np.flatnonzero(voiced)
        v_in = r_in + (idx[0] * HOP if len(idx) else 0)
        v_out = r_in + ((idx[-1] + 1) * HOP if len(idx) else (i1 - i0) * HOP)
        pauses = []
        k = idx[0] if len(idx) else 0
        end = idx[-1] if len(idx) else 0
        while k <= end:
            if not voiced[k]:
                j = k
                while j <= end and not voiced[j]:
                    j += 1
                if (j - k) * HOP >= a.min_pause:
                    pauses.append([round(r_in + k * HOP, 3), round(r_in + j * HOP, 3)])
                k = j
            else:
                k += 1
        out.append({"in": r_in, "out": r_out, "voiceIn": round(v_in, 3), "voiceOut": round(v_out, 3), "thrDb": round(thr, 1), "pauses": pauses})
    with open(a.out, "w") as f:
        json.dump(out, f, indent=1)


if __name__ == "__main__":
    main()
