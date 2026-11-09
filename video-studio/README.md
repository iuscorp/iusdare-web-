# Vocare Iuris Video Studio

Sistema de edición programático (Remotion + React + TypeScript + FFmpeg + Whisper) que
sistematiza el lenguaje audiovisual de Vocare Iuris. Entrada: **raw footage + brief**.
Salida: canvas de propuesta para aprobar → video editado, subtitulado, graduado y verificado.

```
ANÁLISIS → ESTRUCTURA NARRATIVA → CÓDIGOS NATIVOS → CANVAS VISUAL → APROBACIÓN
        → EDICIÓN COMPLETA → CONTROL DE CALIDAD → EXPORTACIÓN
```

## Inicio rápido
```bash
cd video-studio
npm install                 # dependencias + stickers 3D
npm run setup:python        # Whisper (faster-whisper) en .venv
npm run sfx                 # (opcional) regenerar la librería de SFX

npm run new -- cobros-bancarios ~/Descargas/toma1.mp4 --title "Cobros no informados"
#   → completar projects/cobros-bancarios/brief.md
npm run analyze -- cobros-bancarios     # técnica + transcripción + plan de limpieza
npm run draft -- cobros-bancarios       # EDL borrador (cortes, reencuadres, subtítulos, recursos)
#   → el editor (Claude) afina projects/<slug>/edl.json según el brief
npm run grade -- cobros-bancarios       # look «Combinación visual»
npm run canvas -- cobros-bancarios      # canvas/<slug>/index.html  ← REVISIÓN OBLIGATORIA
npm run approve -- cobros-bancarios "OK, cambiar sticker del banco"   # sólo tras aprobación
npm run render -- cobros-bancarios --preview   # versión de revisión + QC
npm run render -- cobros-bancarios             # final → exports/<slug>/ + QC
```

## Estructura
| Carpeta | Contenido |
|---|---|
| `src/brand/` | Tokens de identidad (colores, fuentes, ritmo, encuadres, audio, zonas seguras) |
| `src/subtitles/` | Subtítulo palabra-a-palabra |
| `src/motion-graphics/` | Biblioteca de recursos (15 componentes) |
| `src/framing/` | Reencuadres, punch-in, crash zoom |
| `src/color/` | Previsualización CSS del look |
| `src/audio/` | SFX y música |
| `src/compositions/` | `VocareEdit` (maestra, conducida por EDL) y `ComponentLibrary` |
| `color-presets/` | Presets de color (JSON, compartidos por FFmpeg y Remotion) |
| `templates/` | Códigos nativos, glosario de correcciones |
| `scripts/` | CLI del flujo (new, analyze, draft, grade, canvas, approve, render, qc) |
| `briefs/TEMPLATE.md` | Plantilla de brief |
| `references/` | Ingeniería inversa de las referencias + datos de soporte |
| `documentation/` | Guías |
| `footage/raw/`, `public/footage/` | Material de cámara (no se versiona) |
| `projects/<slug>/` | brief, análisis, EDL, QC de cada video |
| `canvas/`, `previews/`, `exports/` | Salidas (no se versionan los videos) |

## Documentación
1. [`references/REFERENCE_ANALYSIS.md`](references/REFERENCE_ANALYSIS.md) — lenguaje audiovisual extraído
2. [`documentation/01-flujo.md`](documentation/01-flujo.md) — flujo obligatorio paso a paso
3. [`documentation/02-componentes.md`](documentation/02-componentes.md) — guía de componentes y EDL
4. [`documentation/03-subtitulos-y-ritmo.md`](documentation/03-subtitulos-y-ritmo.md) — subtítulos y limpieza de silencios
5. [`documentation/04-color.md`](documentation/04-color.md) — preset «Combinación visual»
6. [`documentation/05-codigos-nativos.md`](documentation/05-codigos-nativos.md) — Guille Collado / códigos nativos
7. [`documentation/06-render-y-qc.md`](documentation/06-render-y-qc.md) — renderizado y control de calidad

Tipografías de marca: **DM Sans Bold** (subtítulos), **Poppins** y **Druk Wide** (textos en pantalla).
Druk Wide es comercial y no se incluye: copiar el archivo con licencia como `public/fonts/DrukWide-Bold.otf`
(o `.woff2`/`.ttf`, o `DrukWide-Heavy`/`DrukWide-Super`); mientras falte se usa Archivo Expanded como sustituto.

Licencias de assets: DM Sans, Poppins, Archivo y Playfair Display (SIL OFL), Fluent Emoji 3D de Microsoft
(MIT, vía `@lobehub/fluent-emoji-3d`), SFX sintetizados por el propio estudio.
