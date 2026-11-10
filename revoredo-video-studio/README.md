# Revoredo Abogados Video Studio

Sistema de producción audiovisual reutilizable para los contenidos de **Revoredo Abogados**. Convierte raw footage y un brief en videos corporativos, minimalistas y contemporáneos. Usa cortes directos, reencuadres, B-roll con función narrativa y Códigos Nativos aplicados con criterio.

**Motor:** Remotion 4 + React + TypeScript · FFmpeg/FFprobe · faster-whisper.

## Inicio rápido

```bash
npm i
pip install faster-whisper numpy pillow     # transcripción

npm run studio:new -- 2026-12-mi-caso --source ruta/al/raw.mp4 --title "Mi caso"
npm run studio:analyze -- 2026-12-mi-caso --apply-captions   # PASO 1
#   editar projects/2026-12-mi-caso/edit.json                # PASO 2 y 3 (story, segments, broll, graphics)
npm run studio:broll -- needs 2026-12-mi-caso                # PASO 3
npm run studio:canvas -- 2026-12-mi-caso                     # PASO 4: canvas obligatorio → validar
#   meta.status = "aprobado"
npm run studio:render -- 2026-12-mi-caso --preview           # revisión
npm run studio:render -- 2026-12-mi-caso                     # final 1080p + loudnorm + QC
```

`npm run dev` abre Remotion Studio con la plantilla de ejemplo (`projects/_plantilla/edit.json`, con material de relleno). `npm run studio:showcase` renderiza la biblioteca de motion graphics.

## Manual

| Documento | Contenido |
|---|---|
| [01 · Referencias](documentation/01-referencias.md) | Índice de videos analizados |
| [03 · Lenguaje audiovisual](documentation/03-lenguaje-audiovisual.md) | Principios, estructura base y reglas de ritmo |
| [Referencia 01 · caso gimnasio](references/revoredo-caso-gimnasio-biometria/analisis.md) | Ingeniería inversa del video de referencia |
| [02 · Identidad de marca](documentation/02-identidad-de-marca.md) | Paleta, tipografía, logo y reglas de composición |
| [04 · Códigos Nativos](documentation/04-codigos-nativos.md) | Metodología de retención aplicada al tono corporativo |
| [05 · Sistema de B-roll](documentation/05-sistema-b-roll.md) | Proceso, fuentes, criterios, biblioteca y CLI |
| [06 · Encuadres y cortes](documentation/06-encuadres-y-cortes.md) | Presets, punch-ins y reglas de corte |
| [07 · Audio](documentation/07-audio.md) | Voz, loudness, música y SFX |
| [08 · Motion graphics](documentation/08-motion-graphics.md) | Biblioteca de componentes y colocación sin tapar el rostro |
| [09 · Arquitectura técnica](documentation/09-arquitectura-tecnica.md) | EDL, estructura, capas y CLI |
| [10 · Flujo de producción](documentation/10-flujo-de-produccion.md) | Los 8 pasos obligatorios |
| [11 · Control de calidad](documentation/11-control-de-calidad.md) | QC automático y checklist humana |
| [12 · Prueba de sistema](documentation/12-prueba-de-sistema.md) | Validación integral con la referencia |

## Estructura

```
brand/  references/  briefs/  projects/  b-roll/  canvas/  previews/  exports/  documentation/
public/ (brand · footage/raw · b-roll/library · audio)   scripts/ (CLI)   src/ (motor Remotion)
```

El detalle está en [09 · Arquitectura técnica](documentation/09-arquitectura-tecnica.md).
