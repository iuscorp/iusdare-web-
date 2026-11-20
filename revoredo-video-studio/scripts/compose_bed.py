#!/usr/bin/env python3
"""
COMPOSE BED — cama musical corporativa original (sin licencias de terceros).

  python3 -I scripts/compose_bed.py <out.wav> --seconds 110 [--bpm 100] [--key C] [--mood bright|calm] [--seed 1]
  (npm run studio:music -- <out.wav> --seconds 110)

Estructura: intro (pad + piano) → cuerpo (añade bajo, kick suave y shaker)
→ outro (vuelve a pad + piano, fade). Progresión I–V–vi–IV (bright) o
vi–IV–I–V (calm). Pensada para ir ~20 dB bajo la voz: sin melodía
protagonista, sin frecuencias medias agresivas (deja libre 1–4 kHz para la voz).
"""
import argparse
import wave

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--seconds", type=float, required=True)
ap.add_argument("--bpm", type=float, default=100)
ap.add_argument("--key", default="C")
ap.add_argument("--mood", default="bright", choices=["bright", "calm"])
ap.add_argument("--seed", type=int, default=1)
a = ap.parse_args()

SR = 48000
rng = np.random.default_rng(a.seed)
N = int(a.seconds * SR)
beat = 60 / a.bpm
bar = 4 * beat

KEYS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "Bb": 10}
root = 48 + KEYS.get(a.key, 0)  # C3
# scale degrees → chord (triad in major key), semitones from root
CH = {"I": [0, 4, 7], "V": [7, 11, 14], "vi": [9, 12, 16], "IV": [5, 9, 12], "ii": [2, 5, 9]}
prog = ["I", "V", "vi", "IV"] if a.mood == "bright" else ["vi", "IV", "I", "V"]

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

t_all = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * np.cos((pan + 1) * np.pi / 4)
    R[i : i + len(sig)] += sig * np.sin((pan + 1) * np.pi / 4)

def env_adsr(n, att, rel):
    e = np.ones(n)
    ai, ri = int(att * SR), int(rel * SR)
    e[:ai] = np.linspace(0, 1, max(ai, 1))[:ai]
    if ri > 0:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e

def piano(m, dur, vel):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
         + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5))
    s *= np.exp(-t * 2.2) * env_adsr(n, 0.004, 0.08)
    return s * vel

def pad(ms, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.0, 0.08):
            f = hz(m + det)
            s += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    s /= len(ms) * 3
    return s * env_adsr(n, dur * 0.35, dur * 0.35)

def bass(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * hz(m) * t) + 0.25 * np.sin(2 * np.pi * 2 * hz(m) * t)
    return s * env_adsr(n, 0.01, 0.12) * 0.9

def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def shaker():
    n = int(0.06 * SR)
    s = rng.standard_normal(n)
    s = np.diff(np.concatenate([[0], s]))  # crude high-pass
    return s * np.exp(-np.arange(n) / SR * 60) * 0.25

bars = int(np.ceil(a.seconds / bar))
intro_bars, outro_bars = 2, 2
for b in range(bars):
    t0 = b * bar
    ch = CH[prog[b % 4]]
    body = intro_bars <= b < bars - outro_bars
    # pad
    add(pad([root + 12 + x for x in ch], bar * 1.05), t0, 0, 0.16)
    # piano arpeggio in 8ths (up-down), soft velocities, gentle humanize
    arp = [root + 24 + x for x in ch] + [root + 36 + ch[0]]
    pattern = [0, 1, 2, 3, 2, 1, 2, 1]
    for k in range(8):
        m = arp[pattern[k] % len(arp)]
        vel = 0.30 if k % 2 == 0 else 0.22
        add(piano(m, beat * 1.6, vel), t0 + k * beat / 2 + rng.uniform(0, 0.006), pan=0.25 if k % 2 else -0.25)
    if body:
        add(bass(root - 12 + ch[0], bar * 0.95), t0, 0, 0.14)
        for q in range(4):
            if q in (0, 2):
                add(kick(), t0 + q * beat, 0, 0.12)
        for s16 in range(16):
            if s16 % 2 == 1:
                add(shaker(), t0 + s16 * beat / 4, 0.4, 0.5 if s16 % 4 == 3 else 0.3)

# simple stereo reverb (exponentially decaying noise IR)
ir_n = int(1.6 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 3.2)
ir /= np.sqrt((ir ** 2).sum())
def conv(x):
    n = len(x) + ir_n - 1
    nfft = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
    return y
L = L + 0.22 * conv(L)
R = R + 0.22 * conv(R[::-1])[::-1] * 0 + 0.22 * conv(R)

# gentle low-pass ~9 kHz (one-pole) to keep it warm and away from voice sibilance
def lp(x, fc=9000):
    al = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(0, len(x), 1):
        acc += al * (x[i] - acc)
        y[i] = acc
    return y
try:
    from scipy.signal import lfilter  # fast path if available
    def lp(x, fc=9000):  # noqa: F811
        al = 1 - np.exp(-2 * np.pi * fc / SR)
        return lfilter([al], [1, -(1 - al)], x)
except Exception:
    pass
L, R = lp(L), lp(R)

# high-pass ~70 Hz: no rumble under the voice
try:
    from scipy.signal import butter, sosfilt
    sos = butter(2, 70, btype="highpass", fs=SR, output="sos")
    L, R = sosfilt(sos, L), sosfilt(sos, R)
except Exception:
    pass

# fades + normalize to -1 dBFS peak
fade_in, fade_out = int(1.5 * SR), int(3.0 * SR)
for ch_ in (L, R):
    ch_[:fade_in] *= np.linspace(0, 1, fade_in)
    ch_[-fade_out:] *= np.linspace(1, 0, fade_out)
peak = max(np.abs(L).max(), np.abs(R).max())
g = 0.89 / peak
st = np.stack([L * g, R * g], axis=1)
pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
with wave.open(a.out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"✔ {a.out}: {a.seconds:.1f} s · {a.bpm} BPM · {a.key} · {a.mood}")
