#!/usr/bin/env python3
"""Recorte del presentador con transparencia (para poner textos DETRÁS de la persona).

Uso: segment-person.py <video> <salida.webm> [--start S] [--end E]

Usa MediaPipe Image Segmenter (selfie_multiclass_256x256, Apache 2.0): alfa = 1 − prob(fondo),
que incluye pelo, rostro, cuerpo, ropa y accesorios. Suaviza el borde y estabiliza el matte en
el tiempo para que no parpadee. Escribe un WebM VP9 con canal alfa (yuva420p) del mismo tamaño
y fps que el video, para el tramo pedido (tiempos del archivo fuente).
"""
import argparse
import os
import subprocess
import sys

import cv2
import numpy as np

MODEL = os.path.join(os.path.dirname(__file__), "..", "models", "selfie_multiclass_256x256.tflite")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None)
    a = ap.parse_args()

    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        subprocess.run(["curl", "-sSfL", "-o", MODEL, MODEL_URL], check=True)

    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import ImageSegmenter, ImageSegmenterOptions, RunningMode

    seg = ImageSegmenter.create_from_options(
        ImageSegmenterOptions(
            base_options=BaseOptions(model_asset_path=MODEL),
            running_mode=RunningMode.VIDEO,
            output_confidence_masks=True,
            output_category_mask=False,
        )
    )
    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    start_f = int(round(a.start * fps))
    end_f = int(round(a.end * fps)) if a.end is not None else int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_f)

    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
         "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24", "-row-mt", "1", "-auto-alt-ref", "0", a.out],
        stdin=subprocess.PIPE,
    )
    prev = None
    n = 0
    for i in range(start_f, end_f):
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
        bg = res.confidence_masks[0].numpy_view().astype(np.float32)
        alpha = cv2.resize(1.0 - bg, (w, h), interpolation=cv2.INTER_LINEAR)
        # endurecer el matte (curva) y suavizar el borde
        alpha = np.clip((alpha - 0.35) / 0.3, 0, 1)
        alpha = cv2.GaussianBlur(alpha, (0, 0), 2.0)
        # estabilidad temporal: media exponencial ligera
        if prev is not None:
            alpha = 0.7 * alpha + 0.3 * prev
        prev = alpha
        rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
        enc.stdin.write(rgba.tobytes())
        n += 1
    enc.stdin.close()
    enc.wait()
    seg.close()
    print(f"recorte: {n} fotogramas ({a.start:.2f}–{a.start + n / fps:.2f} s) → {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
