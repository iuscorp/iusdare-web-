#!/usr/bin/env python3
"""Bordes de corte en SILENCIO real: ninguna palabra queda cortada.

Uso: edges.py <media> <ranges.json> <salida.json> [--max-ext 0.4] [--split-hz 165]

El ajuste acústico corta cuando la voz baja ~24 dB, pero las sílabas finales suaves («-cos»,
«-do») siguen sonando por debajo. Aquí cada inicio se adelanta y cada final se alarga hasta
el primer silencio real (≥ 80 ms bajo p90 − 20 dB; una respiración suave cuenta como silencio), como mucho --max-ext s, y se detiene si aparece
otra voz (tono > --split-hz y nivel < --quiet-db: quien dicta detrás de cámara, lejos del micro). Nunca invade el tramo vecino.
"""
import argparse, json, subprocess
import numpy as np

SR = 16000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("media"); ap.add_argument("ranges"); ap.add_argument("out")
    ap.add_argument("--max-ext", type=float, default=0.4)
    ap.add_argument("--split-hz", type=float, default=165.0)
    ap.add_argument("--quiet-db", type=float, default=-30.0)
    ap.add_argument("--sil-drop", type=float, default=20.0)
    a = ap.parse_args()
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.media, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, stdout=subprocess.PIPE).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    h = int(0.01 * SR); n = len(x) // h
    fr = x[: n * h].reshape(n, h)
    db = 20 * np.log10(np.sqrt(np.mean(fr**2, axis=1)) + 1e-9)
    sil = np.percentile(db, 90) - a.sil_drop  # respiración suave = silencio
    # tono cada 10 ms (ventana 40 ms)
    win = int(0.04 * SR); lo, hi = int(SR / 400), int(SR / 70)
    def f0(i):
        s = i * h
        seg = x[s : s + win]
        if len(seg) < win or np.sqrt(np.mean(seg**2)) < 0.01:
            return 0.0
        seg = seg * np.hanning(win)
        ac = np.correlate(seg, seg, "full")[win - 1 :]
        k = lo + int(np.argmax(ac[lo:hi]))
        return SR / k if ac[k] > 0.35 * ac[0] else 0.0
    rng = json.load(open(a.ranges))
    out, moved = [], 0.0
    maxk = int(a.max_ext * 100)
    RUN = 8  # un silencio sólo cuenta si dura ≥ 80 ms (las oclusivas «k/p/t» tienen micro-silencios)

    def silent_run(k, step):
        return all(0 <= k + step * q < n and db[k + step * q] < sil for q in range(RUN))

    def other_voice(k, step):
        # otra voz = tono alto Y nivel bajo (quien dicta está lejos del micrófono), 3 frames seguidos
        return all(0 <= k + step * q < n and f0(k + step * q) > a.split_hz and db[k + step * q] < a.quiet_db for q in range(3))

    for j, (r_in, r_out) in enumerate(rng):
        prev_out = out[-1][1] if out else 0.0
        nxt_in = rng[j + 1][0] if j + 1 < len(rng) else n / 100
        i0, i1 = int(round(r_in * 100)), int(round(r_out * 100))
        k = i0
        while k > 0 and i0 - k < maxk and not silent_run(k - 1, -1) and (k - 1) / 100 > prev_out + 0.01 and not other_voice(k - 1, -1):
            k -= 1
        m = i1
        while m < n - 1 and m - i1 < maxk and not silent_run(m, 1) and (m + 1) / 100 < nxt_in - 0.01 and not other_voice(m, 1):
            m += 1
        moved += (i0 - k + m - i1) / 100
        out.append([round(k / 100, 3), round(m / 100, 3)])
    json.dump(out, open(a.out, "w"))
    print(f"bordes en silencio: +{moved:.2f} s recuperados en {len(rng)} tramos")


if __name__ == "__main__":
    main()
