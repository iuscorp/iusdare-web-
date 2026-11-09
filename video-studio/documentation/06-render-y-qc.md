# Renderizado y control de calidad

## Render
```bash
npm run render -- <slug> --preview   # 540×960, CRF 23 → previews/<slug>/<slug>-preview.mp4
npm run render -- <slug>             # 1080×1920, CRF 16 → exports/<slug>/<slug>.mp4 (requiere aprobación)
npm run studio                       # Remotion Studio para inspeccionar cuadro a cuadro
```
Pasos internos: validación del EDL → stickers necesarios → render Remotion (Chromium headless;
usa `REMOTION_BROWSER` o el del entorno si existe) → loudnorm en dos pasadas a −14 LUFS /
−1.5 dBTP → QC automático. Tiempo orientativo en 4 vCPU: ~3–4 min por minuto de video (preview).

## QC automático (`npm run qc -- <slug>`)
| Verificación | Criterio |
|---|---|
| Resolución / FPS | 1080×1920 / 30 (preview 540×960) |
| Duración | = suma de planos del EDL (±0.15 s) |
| Fotogramas negros | ninguno (detecta incluso 1 fotograma) |
| Loudness / true peak | −14 ±1 LUFS / ≤ −0.5 dBTP |
| Silencios residuales | ninguno > 0.6 s |
| Primera palabra | < 0.15 s |
| Sincronía de subtítulos | re-transcripción del render: mediana < 80 ms, p90 < 200 ms |
| Ortografía / términos | ≤ 8 % de palabras discrepantes (lista para revisión) |

## Revisión visual obligatoria
Abrir `projects/<slug>/qc/contact-sheet.jpg` y ver el video completo. Checklist:
ritmo y continuidad · subtítulo legible y sin tapar el rostro · recursos dentro de zona segura
(`showSafeZones: true` en el EDL para comprobarlo) · color consistente entre planos ·
saltos de encuadre intencionales · **precisión jurídica** de cada texto en pantalla ·
CTA completo · sin fotogramas negros ni congelados.

## Lección registrada en la construcción del estudio
La primera prueba end-to-end tenía 5 fotogramas negros sueltos al final de algunos planos
(desajuste de redondeo entre duración del plano y recorte del video). Se corrigió con
`segmentFrames()` y el detector de negros pasó a umbral de 1 fotograma. La revisión visual de
la hoja de contacto fue la que lo descubrió: por eso es obligatoria.
