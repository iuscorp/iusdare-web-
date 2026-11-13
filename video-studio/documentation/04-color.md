# Tratamiento de color — preset «Combinación visual»

> **Decisión de Vocare Iuris: por defecto NO se colorea el video.** Los EDL nacen con
> `colorPreset: "none"` y el render usa el footage original. El preset de abajo queda
> disponible sólo si se pide explícitamente (`npm run grade -- <slug>`).

## Estado
**Réplica comparativa calibrada. NO es una copia verificada del ajuste de CapCut.** No se tuvo
acceso al proyecto de CapCut ni a sus parámetros. Si se consiguen (captura del panel de ajuste o
el proyecto), actualizar `color-presets/combinacion-visual.json` y repetir la calibración.

## Qué hace el look (medido en las referencias)
- Negros profundos (L* p1 ≈ 0–2) sin aplastar medios tonos.
- Altas luces contenidas (L* p99 ≈ 89–94): la pared clara no se quema.
- Saturación media moderada (≈ 0.22 HSV) — colores vivos pero piel natural.
- Sesgo cálido leve (a* ≈ +4, b* ≈ +4).
- **Glow / halación** suave en altas luces (bordes de cabello y piel brillan).
- Nitidez ligeramente realzada.

## Implementación (FFmpeg, `scripts/lib/color.mjs`)
```
eq (contraste 1.06, saturación 1.32) → colorbalance (medios +R −B leve)
→ curves (negros a 0, roll-off de blancos a 0.965)
→ glow: copia con umbral de luces (>0.55) + gblur σ20, mezcla screen 26 %
→ unsharp 5x5 0.35
```
Parámetros en `color-presets/combinacion-visual.json`. Uso:
```bash
npm run grade -- <slug>                       # proyecto
npm run grade -- --file in.mp4 --out out.mp4  # archivo suelto
```
En Remotion Studio existe además una aproximación en CSS (`src/color/ColorLook.tsx`) para
previsualizar footage aún sin graduar; el render final usa siempre la versión FFmpeg.

## Calibración realizada
Se aplicó el preset a la referencia más plana (`20261024.MOV`) y se comparó con la media de las
otras cuatro (ver `references/frames/color-calibration.jpg`: izq. original, centro preset, der. referencia):

| | L* p1 | L* p99 | Sat. | a* | b* |
|---|---|---|---|---|---|
| Objetivo (media refs) | 1.1 | 89.4 | 0.22 | +4.4 | +3.7 |
| Antes | 5.1 | 82.3 | 0.15 | +4.9 | +2.4 |
| Después | 0.4 | 88.8 | 0.23 | +6.4 | +5.0 |

Limitación: el `.MOV` ya era una exportación editada (con subtítulos), así que no es un "raw" puro.

## Cómo afinar
- Piel demasiado naranja → bajar `warmth.midtones[0]`.
- Glow excesivo con fondos muy claros → bajar `glow.opacity` (0.18–0.22) o subir `glow.threshold`.
- Footage oscuro → subir `brightness` a 0.02–0.04 antes que el contraste.
