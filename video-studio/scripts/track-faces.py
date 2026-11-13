#!/usr/bin/env python3
"""Seguimiento de VARIAS cabezas (entrevistas, lives): una pista por persona.

Uso: track-faces.py <video> <salida.json> [--names L,R]

Detecta rostros (OpenCV Haar frontal + perfil) en cada fotograma y mantiene dos pistas:
L = persona de la izquierda, R = persona de la derecha. Con dos rostros se asignan por
posición; con uno solo, a la pista cuya última posición está más cerca (así en un plano
individual el rostro sigue siendo de quien es). Huecos interpolados y trayectoria suavizada.

Salida: {"fps": 24, "tracks": {"L": {"cx": [...], "top": [...]}, "R": {...}}, "detected": {...}}
"""
import argparse, json

import cv2
import numpy as np

HAIR = 0.30


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    a = ap.parse_args()
    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    front = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    prof = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    tr = {"L": [], "R": []}
    last = {"L": None, "R": None}
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        W = 540
        small = cv2.resize(frame, (W, int(h * W / w)))
        sh = small.shape[0]
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        ms = (int(W * 0.06), int(W * 0.06))
        faces = list(front.detectMultiScale(gray, 1.1, 5, minSize=ms))
        faces += list(prof.detectMultiScale(gray, 1.1, 5, minSize=ms))
        faces += [(W - x - fw, y, fw, fh) for (x, y, fw, fh) in prof.detectMultiScale(cv2.flip(gray, 1), 1.1, 5, minSize=ms)]
        # sólo la mitad superior del cuadro (cabezas), deduplicar solapes
        pts = []
        for (x, y, fw, fh) in sorted(faces, key=lambda f: -f[2] * f[3]):
            c = ((x + fw / 2) / W, (y - HAIR * fh) / sh, (y + fh / 2) / sh)
            if c[2] > 0.6:
                continue
            if all(abs(c[0] - p[0]) > 0.08 for p in pts):
                pts.append(c)
        pts = sorted(pts[:2], key=lambda p: p[0])
        cur = {"L": None, "R": None}
        if len(pts) == 2 and pts[1][0] - pts[0][0] > 0.15:
            cur["L"], cur["R"] = pts[0], pts[1]
        elif len(pts) >= 1:
            p = pts[0] if len(pts) == 1 else pts[0]
            dl = abs(p[0] - last["L"][0]) if last["L"] else 9
            dr = abs(p[0] - last["R"][0]) if last["R"] else 9
            cur["R" if dr <= dl else "L"] = p
        for k in ("L", "R"):
            if cur[k]:
                last[k] = cur[k]
            tr[k].append(cur[k])
    out = {"fps": fps, "tracks": {}, "detected": {}}
    for k, arr in tr.items():
        cx = np.array([p[0] if p else np.nan for p in arr], dtype=float)
        top = np.array([p[1] if p else np.nan for p in arr], dtype=float)
        out["detected"][k] = round(float(np.mean(~np.isnan(cx))), 3)

        def clean(v, default):
            b = v.copy()
            for i in range(len(v)):
                win = v[max(0, i - 7): i + 8]
                if np.any(~np.isnan(win)) and not np.isnan(v[i]) and abs(v[i] - np.nanmedian(win)) > 0.06:
                    b[i] = np.nan
            idx = np.arange(len(b)); g = ~np.isnan(b)
            b = np.interp(idx, idx[g], b[g]) if g.any() else np.full(len(b), default)
            k_ = np.hanning(9); k_ /= k_.sum()
            return np.convolve(np.pad(b, (4, 4), mode="edge"), k_, mode="valid")

        out["tracks"][k] = {"cx": [round(float(x), 4) for x in clean(cx, 0.3 if k == "L" else 0.7)], "top": [round(float(x), 4) for x in clean(top, 0.3)]}
    json.dump(out, open(a.out, "w"))
    print(f"caras: {len(tr['L'])} fotogramas · detección L {out['detected']['L']:.0%} · R {out['detected']['R']:.0%} → {a.out}")


if __name__ == "__main__":
    main()
