#!/usr/bin/env python3
"""Seguimiento de la cabeza del presentador, fotograma a fotograma.

Uso: track-head.py <video> <salida.json>

Detecta el rostro (OpenCV Haar, frontal + perfil) en cada fotograma, estima el borde
superior de la cabeza (pelo incluido) y el centro horizontal, rellena los huecos sin
detección por interpolación y suaviza la trayectoria para que el subtítulo acompañe el
movimiento sin temblar.

Salida (coordenadas normalizadas 0–1 respecto del fotograma, tiempo del archivo fuente):
  {"fps": 30, "cx": [...], "top": [...], "faceH": [...], "detected": 0.97}
"""
import json
import sys

import cv2
import numpy as np

HAIR = 0.30  # el pelo sobresale ~30 % de la altura del rostro detectado por encima de la frente


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    front = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    prof = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    cx, top, fh = [], [], []
    prev = None
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        scale = 480 / w
        small = cv2.resize(frame, (480, int(h * scale)))
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        min_size = (int(480 * 0.08), int(480 * 0.08))
        faces = list(front.detectMultiScale(gray, 1.1, 5, minSize=min_size))
        if not faces:
            faces = list(prof.detectMultiScale(gray, 1.1, 4, minSize=min_size))
            faces += [(gray.shape[1] - x - fw, y, fw, fh_) for (x, y, fw, fh_) in prof.detectMultiScale(cv2.flip(gray, 1), 1.1, 4, minSize=min_size)]
        best = None
        if faces:
            # el rostro más grande; si hay uno previo, el más cercano a él
            if prev is not None:
                faces.sort(key=lambda f: abs((f[0] + f[2] / 2) / 480 - prev[0]) + abs(f[1] / small.shape[0] - prev[1]))
            else:
                faces.sort(key=lambda f: -f[2] * f[3])
            x, y, fw, fhh = faces[0]
            sh = small.shape[0]
            best = ((x + fw / 2) / 480, (y - HAIR * fhh) / sh, fhh / sh)
            prev = best
        cx.append(best[0] if best else np.nan)
        top.append(best[1] if best else np.nan)
        fh.append(best[2] if best else np.nan)
    cx, top, fh = (np.array(a, dtype=float) for a in (cx, top, fh))
    detected = float(np.mean(~np.isnan(cx))) if len(cx) else 0.0

    def fill(a: np.ndarray, default: float) -> np.ndarray:
        idx = np.arange(len(a))
        good = ~np.isnan(a)
        if not good.any():
            return np.full(len(a), default)
        return np.interp(idx, idx[good], a[good])

    def reject_outliers(a: np.ndarray) -> np.ndarray:
        # descarta saltos aislados (falsos positivos) comparando con la mediana local
        b = a.copy()
        k = 7
        for i in range(len(a)):
            win = a[max(0, i - k): i + k + 1]
            med = np.nanmedian(win) if np.any(~np.isnan(win)) else np.nan
            if not np.isnan(a[i]) and not np.isnan(med) and abs(a[i] - med) > 0.06:
                b[i] = np.nan
        return b

    def smooth(a: np.ndarray, win: int = 9) -> np.ndarray:
        if len(a) < win:
            return a
        k = np.hanning(win)
        k /= k.sum()
        pad = np.pad(a, (win // 2, win // 2), mode="edge")
        return np.convolve(pad, k, mode="valid")

    cx = smooth(fill(reject_outliers(cx), 0.5))
    top = smooth(fill(reject_outliers(top), 0.25))
    fh = smooth(fill(reject_outliers(fh), 0.12))
    data = {
        "fps": fps,
        "cx": [round(float(v), 4) for v in cx],
        "top": [round(float(v), 4) for v in top],
        "faceH": [round(float(v), 4) for v in fh],
        "detected": round(detected, 3),
    }
    with open(out, "w") as f:
        json.dump(data, f)
    print(f"cabeza: {len(cx)} fotogramas, detección {detected:.0%} → {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
