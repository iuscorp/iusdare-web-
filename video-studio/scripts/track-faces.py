#!/usr/bin/env python3
"""Seguimiento de VARIAS cabezas (entrevistas, lives): una pista por persona.

Uso: track-faces.py <video> <salida.json> [--names L,R]

Detecta rostros (MediaPipe FaceLandmarker, hasta 2 caras, robusto a perfiles) cada 2 fotogramas y mantiene dos pistas:
L = persona de la izquierda, R = persona de la derecha. Cada rostro se asigna por lado del
cuadro (--split); los huecos toman la posición típica de esa persona en el clip (--cuts). Huecos interpolados y trayectoria suavizada.

Salida: {"fps": 24, "tracks": {"L": {"cx": [...], "top": [...]}, "R": {...}}, "detected": {...}}
"""
import argparse, json

import cv2
import numpy as np

HAIR = 0.30


def detect_mediapipe(video, step=2):
    """FaceLandmarker (hasta 2 caras): robusto a perfiles. Devuelve por fotograma una lista de (cx, top)."""
    import os
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
    model = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "face_landmarker.task")
    lm = FaceLandmarker.create_from_options(FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model), running_mode=RunningMode.VIDEO, num_faces=2, min_face_detection_confidence=0.3, min_face_presence_confidence=0.3, min_tracking_confidence=0.3))
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    out, i, last = [], 0, []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            small = cv2.resize(frame, (540, int(frame.shape[0] * 540 / frame.shape[1])))
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
            res = lm.detect_for_video(img, int(i * 1000 / fps))
            pts = []
            for f in res.face_landmarks or []:
                xs = [p.x for p in f]; ys = [p.y for p in f]
                fh = max(ys) - min(ys)
                pts.append(((min(xs) + max(xs)) / 2, min(ys) - 0.12 * fh, (min(ys) + max(ys)) / 2))
            last = pts
        out.append(last)
        i += 1
    lm.close()
    return fps, out


def detect_haar(video, step=2):
    """Haar frontal + perfil (ambos lados): complementa a MediaPipe en perfiles muy marcados."""
    front = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    prof = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    cap = cv2.VideoCapture(video)
    out, i, last = [], 0, []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            W = 540
            small = cv2.resize(frame, (W, int(frame.shape[0] * W / frame.shape[1])))
            sh = small.shape[0]
            g = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
            ms = (int(W * 0.06), int(W * 0.06))
            faces = list(front.detectMultiScale(g, 1.1, 5, minSize=ms)) + list(prof.detectMultiScale(g, 1.1, 4, minSize=ms))
            faces += [(W - x - fw, y, fw, fh) for (x, y, fw, fh) in prof.detectMultiScale(cv2.flip(g, 1), 1.1, 4, minSize=ms)]
            last = [((x + fw / 2) / W, (y - HAIR * fh) / sh, (y + fh / 2) / sh) for (x, y, fw, fh) in faces]
        out.append(last)
        i += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    ap.add_argument("--split", type=float, default=0.45, help="x que separa a la persona de la izquierda (L) de la de la derecha (R)")
    ap.add_argument("--cuts", default="", help="tiempos (s) de cambio de clip, separados por comas: la posición típica se calcula por clip")
    a = ap.parse_args()
    fps, frames = detect_mediapipe(a.video)
    haar = detect_haar(a.video)
    frames = [list(m) + list(h) for m, h in zip(frames, haar)]
    tr = {"L": [], "R": []}
    for pts in frames:
        cur = {"L": None, "R": None}
        for p in sorted([p for p in pts if p[2] < 0.65], key=lambda p: p[0]):
            k = "L" if p[0] < a.split else "R"
            if cur[k] is None:
                cur[k] = p
        for k in ("L", "R"):
            tr[k].append(cur[k])
    # huecos: posición típica de esa persona en el mismo clip (apenas se mueve)
    cuts = [0] + [int(float(c) * fps) for c in a.cuts.split(",") if c] + [len(frames)]
    for k in ("L", "R"):
        for c0, c1 in zip(cuts[:-1], cuts[1:]):
            got = [p for p in tr[k][c0:c1] if p]
            if not got:
                continue
            med = tuple(float(np.median([p[q] for p in got])) for q in range(3))
            for f in range(c0, c1):
                if tr[k][f] is None and (f == c0 or f == c1 - 1):
                    tr[k][f] = med
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
