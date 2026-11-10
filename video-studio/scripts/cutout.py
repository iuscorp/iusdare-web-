#!/usr/bin/env python3
"""Recorte de fotos «sin fondo» (estilo sticker) con BiRefNet-lite (ONNX, licencia MIT).

Uso: cutout.py <entrada.jpg> <salida.png> [--outline 10] [--model models/birefnet/model.onnx]

Salida: PNG RGBA recortado al objeto, con un borde blanco de --outline px (estilo sticker de
CapCut). Modelo: huggingface.co/onnx-community/BiRefNet_lite-ONNX → models/birefnet/model.onnx
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL = os.path.join(HERE, "..", "models", "birefnet", "model.onnx")
_sess = None


def session(path):
    global _sess
    if _sess is None:
        import onnxruntime as ort

        _sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    return _sess


def mask(img: Image.Image, model: str) -> np.ndarray:
    s = session(model)
    x = np.asarray(img.convert("RGB").resize((1024, 1024), Image.BILINEAR), dtype=np.float32) / 255.0
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    out = s.run(None, {s.get_inputs()[0].name: x})[-1][0, 0]
    if out.min() < 0 or out.max() > 1:  # logits → probabilidad
        out = 1 / (1 + np.exp(-out))
    m = Image.fromarray((out * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    return np.asarray(m)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--outline", type=int, default=10)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--max", type=int, default=900, help="lado máximo del resultado")
    a = ap.parse_args()
    img = Image.open(a.input).convert("RGB")
    m = mask(img, a.model)
    m = np.where(m > 20, m, 0).astype(np.uint8)
    rgba = img.convert("RGBA")
    rgba.putalpha(Image.fromarray(m))
    ys, xs = np.nonzero(m > 128)
    if len(xs) == 0:
        raise SystemExit("no se detectó objeto")
    pad = a.outline * 2 + 4
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(img.width, xs.max() + pad), min(img.height, ys.max() + pad))
    rgba = rgba.crop(box)
    # lienzo con margen para el borde
    W, H = rgba.width + 2 * pad, rgba.height + 2 * pad
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(rgba, (pad, pad), rgba)
    if a.outline > 0:
        alpha = canvas.split()[3].point(lambda v: 255 if v > 110 else 0)
        grown = alpha.filter(ImageFilter.MaxFilter(a.outline * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
        border = Image.new("RGBA", (W, H), (255, 255, 255, 255))
        border.putalpha(grown)
        border.alpha_composite(canvas)
        canvas = border
    bb = canvas.getbbox()
    canvas = canvas.crop(bb)
    canvas.thumbnail((a.max, a.max), Image.LANCZOS)
    canvas.save(a.output)
    cover = float((m > 128).mean())
    print(f"{os.path.basename(a.output)}: {canvas.width}x{canvas.height}, objeto {cover:.0%} de la foto")


if __name__ == "__main__":
    main()
