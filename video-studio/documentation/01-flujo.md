# Flujo obligatorio para cada video

> ANÁLISIS → ESTRUCTURA NARRATIVA → CÓDIGOS NATIVOS → CANVAS VISUAL → APROBACIÓN
> → EDICIÓN COMPLETA → CONTROL DE CALIDAD → EXPORTACIÓN

## 0. Cargar el material
- Raw footage: cualquier formato/orientación. `npm run new -- <slug> <ruta> --title "…"` lo copia
  intacto a `footage/raw/<slug>/` y crea un proxy de edición 1080×1920 / 30 fps CFR en
  `public/footage/<slug>/source.mp4` (los HEVC/VFR de iPhone se normalizan aquí).
- Varias tomas: unirlas antes (`ffmpeg -f concat`) o crear un proyecto por toma y combinar EDLs.
- Imágenes/logos/portadas para el video: `public/images/<slug>/…` y referenciarlas en el EDL
  como `images/<slug>/archivo.png`.
- Completar `projects/<slug>/brief.md` (plantilla corta: sólo lo específico del video).

## 1. Análisis — `npm run analyze -- <slug>`
Produce `projects/<slug>/analysis/`:
- `probe.json`: duración, resolución, fps, códecs, loudness, silencios, negros, exposición, avisos.
- `transcript.json`: Whisper palabra a palabra con probabilidad (modelo `small` por defecto; `--model medium` para más precisión).
- `cleanup.json`: plan de limpieza (silencios, muletillas, tomas repetidas, tartamudeos, pausas conservadas, palabras dudosas).
- `analysis.md`: resumen legible.

## 2–3. Estructura narrativa y códigos nativos — `npm run draft -- <slug>`
Genera `edl.json` con: planos (in/out, función narrativa, encuadre, movimiento), subtítulos
remapeados a la línea de tiempo final, recursos sugeridos (`auto: true`) y SFX.
**Después, el editor afina el EDL contra el brief**: corrige textos legales exactos, ajusta la
función de cada plano, añade/quita recursos (cada uno con función), y si conviene reordenar
la narrativa lo **propone** (no cambia el contenido sustancial sin autorización).

## 4. Canvas — `npm run grade -- <slug>` y `npm run canvas -- <slug>`
`canvas/<slug>/index.html` (abrir en el navegador; no requiere servidor):
- Reproductor que reproduce el footage real saltando los cortes, con reencuadres y subtítulos.
- A. Secuencia narrativa · B. Cortes y ritmo (forma de onda) · C. Encuadres original vs propuesto ·
  D. Códigos nativos por momento · E. Fotogramas REALES renderizados con Remotion · F. Audio.

## 5. Aprobación
Presentar el canvas. Si hay cambios: editar `edl.json` → `npm run canvas` de nuevo.
Con la aprobación explícita del responsable: `npm run approve -- <slug> "nota"`.
`npm run render` (final) se niega a ejecutar sin aprobación registrada.

## 6. Edición completa — `npm run render -- <slug> --preview` → revisar → `npm run render -- <slug>`
Cortes, limpieza, reencuadres, códigos nativos, recursos, subtítulos, color (footage graduado),
audio normalizado a −14 LUFS. Ver `06-render-y-qc.md`.

## 7. Control de calidad
Automático tras cada render (`projects/<slug>/qc/qc-report.md`) **más revisión visual
obligatoria** de `qc/contact-sheet.jpg` y del video completo. El trabajo no está terminado
porque compile: está terminado cuando el render se ha visto y no tiene errores.

## 8. Exportación
`exports/<slug>/<slug>.mp4` — 1080×1920, 30 fps, H.264 CRF 16, AAC 256 kbps, −14 LUFS.
