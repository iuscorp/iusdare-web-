#!/usr/bin/env python3
"""Actividad del presentador en cámara: ¿está hablando la persona que vemos?

Uso: speaker-activity.py <video> <salida.json> [--step 2]

En sesiones en bruto suele haber una voz detrás de cámara (quien dicta las frases). Para no
montar esas tomas se mide, fotograma a fotograma:
  - apertura de la boca del presentador (MediaPipe Face Landmarker, labios 13/14 normalizados
    por la altura del rostro)
  - nivel de audio (RMS dB) en ventanas de 0.1 s
El estudio cruza ambas señales con la transcripción (scripts/lib/speaker.mjs).
Salida: {"fps", "step", "mouth": [...], "rmsHop": 0.1, "rms": [...]}
"""
import argparse
import json
import os
import subprocess
import sys

import cv2
import numpy as np

MODEL = os.path.join(os.path.dirname(__file__), "..", "models", "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"


def audio_rms(path: str, hop: float = 0.1) -> list:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], check=True, stdout=subprocess.PIPE).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    n = int(16000 * hop)
    out = []
    for k in range(0, len(a) - n, n):
        r = float(np.sqrt(np.mean(a[k : k + n] ** 2)) + 1e-9)
        out.append(round(20 * np.log10(r), 1))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--step", type=int, default=2)
    a = ap.parse_args()
    if not os.path.exists(MODEL):
        subprocess.run(["curl", "-sSfL", "-o", MODEL, MODEL_URL], check=True)

    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode

    lm = FaceLandmarker.create_from_options(
        FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=MODEL), running_mode=RunningMode.VIDEO, num_faces=1)
    )
    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    mouth = []
    i = 0
    while True:
        ok = cap.grab()
        if not ok:
            break
        if i % a.step == 0:
            _, frame = cap.retrieve()
            small = cv2.resize(frame, (360, 640))
            rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
            if res.face_landmarks:
                p = res.face_landmarks[0]
                face_h = abs(p[152].y - p[10].y) or 1e-6  # mentón – frente
                mouth.append(round(abs(p[14].y - p[13].y) / face_h, 4))
            else:
                mouth.append(None)
        i += 1
    lm.close()
    data = {"fps": fps, "step": a.step, "mouth": mouth, "rmsHop": 0.1, "rms": audio_rms(a.video)}
    with open(a.out, "w") as f:
        json.dump(data, f)
    print(f"actividad: {len(mouth)} muestras de boca, {len(data['rms'])} de audio → {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
