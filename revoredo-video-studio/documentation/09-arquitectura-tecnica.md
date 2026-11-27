# 09 · Arquitectura técnica

**Stack:** Remotion 4 · React 19 · TypeScript · Zod · FFmpeg/FFprobe · faster-whisper (Python) · Chromium headless.

## Idea central: un EDL por video

Cada video es **datos, no código**: `projects/<slug>/edit.json`. El EDL (lista de decisiones de edición) se valida con `src/schema/edit.ts`. Ese mismo archivo lo leen cuatro piezas:

- el template Remotion (`RevoredoReel`);
- el generador del canvas;
- el renderizador;
- el QC.

Cambiar la edición significa editar el JSON. El código del estudio no se toca.

```
edit.json
├─ meta          slug, título, formato (vertical/square/horizontal), fps, estado del flujo
├─ sources       id → raw en public/ (multi-cámara: varias fuentes)
├─ story         problema · por qué importa · riesgo · pregunta abierta · payoff · CTA
├─ layout        caja del rostro (faceTop/faceBottom) → gráficos sin tapar la cara
├─ segments[]    in/out del raw · rol narrativo · encuadre/zoom · códigos nativos · transición
├─ graphics[]    componente MG + props + función + rationale (tiempo del raw)
├─ broll[]       slot narrativo + recurso asignado + fuente/licencia (tiempo del raw)
├─ captions      palabras con tiempos + énfasis + correcciones
├─ audio         voz · música · sfx
└─ endCard
```

**Reloj del raw (source time):** los subtítulos, gráficos y B-roll se anclan a segundos del raw, el mismo reloj de la transcripción. `src/lib/timeline.ts` los traduce al timeline final. Si un tramo se corta, lo que estaba anclado ahí desaparece. Si un elemento cruza un corte, se recorta.

## Estructura del proyecto

```
revoredo-video-studio/
├─ CLAUDE.md                 Instrucciones operativas para sesiones futuras
├─ brand/glossary.json       Términos de marca y jurídicos (transcripción y ortografía)
├─ references/               Ingeniería inversa de los videos de referencia
├─ briefs/                   Plantilla de brief
├─ projects/<slug>/          edit.json · brief.md · analysis/
├─ b-roll/library.json       Registro de la biblioteca de B-roll (metadatos y licencias)
├─ canvas/<slug>/index.html  Canvas de preview (PASO 4)
├─ previews/<slug>/          Renders de revisión (540p)
├─ exports/<slug>/           Finales 1080p + informe QC + hoja de contacto
├─ documentation/            Este manual
├─ public/                   Todo lo que el render lee (servido por Remotion)
│  ├─ brand/fonts · brand/logo
│  ├─ footage/raw/<slug>/    Raw footage (no se versiona)
│  ├─ b-roll/library/        Media de B-roll (no se versiona)
│  └─ audio/music · audio/sfx
├─ scripts/                  CLI del estudio (tsx)
└─ src/
   ├─ brand/                 tokens.ts (colores, tipografía, motion) · fonts.ts
   ├─ schema/edit.ts         Esquema Zod del EDL
   ├─ lib/                   timeline (source → output) · anim · layout (zonas sin rostro)
   ├─ components/            text/Captions · brand/LogoMark
   ├─ motion-graphics/       Biblioteca MG + registro
   ├─ framing/               Presets de encuadre + Reframe (punch-in)
   ├─ b-roll/                BRollClip (full / split-top / card, placeholder pendiente)
   ├─ transitions/           Acentos de corte (flash, light leak, dip)
   ├─ audio/                 AudioBed (música con ducking, sfx)
   ├─ templates/             RevoredoReel (motor) · LibraryShowcase
   └─ Root.tsx               Registro de composiciones
```

> El raw, el B-roll, la música y el material de referencia van en `public/` porque Remotion solo sirve archivos desde ahí. `public/footage/raw/`, `public/b-roll/library/`, `previews/`, `exports/` y `canvas/` están en `.gitignore`. Se sincronizan por Drive.

## Capas del template `RevoredoReel`

1. Segmentos del presentador: `<Sequence>` + `<Reframe>` + `<Video trimBefore>`.
2. B-roll.
3. Acentos de corte.
4. Motion graphics, envueltos en `ZoneContext` para colocarlos sin tapar el rostro.
5. Subtítulos.
6. Bug del logo.
7. End card.
8. Audio.

La duración y el formato se calculan en `calculateMetadata` a partir del EDL.

## CLI

| Comando | Paso |
|---|---|
| `npm run studio:new -- <slug> --source raw.mp4 --title "…"` | Crear el proyecto |
| `npm run studio:analyze -- <slug> [--apply-captions] [--model medium]` | PASO 1: análisis técnico, transcripción y alertas |
| `npm run studio:broll -- needs\|search\|remote\|add\|assign\|list` | PASO 3: B-roll |
| `npm run studio:canvas -- <slug>` | PASO 4: canvas obligatorio |
| `npm run studio:render -- <slug> --preview [--hud]` | Render de revisión |
| `npm run studio:render -- <slug>` | Final (exige el canvas y `status` aprobado) + loudnorm + QC |
| `npm run studio:qc -- <video> --slug <slug>` | QC independiente |
| `npm run studio:showcase` | Revisar la biblioteca MG |
| `npm run dev` | Remotion Studio (edición visual de props) |
| `npm run lint` | ESLint + TypeScript (src y scripts) |

## Requisitos del entorno

- Node ≥ 20 y `npm i`.
- FFmpeg/FFprobe en el PATH.
- Python 3 con `pip install faster-whisper numpy pillow` (la primera vez descarga el modelo `small`, unos 460 MB).
- Chromium: se detecta automáticamente en `/opt/pw-browsers` o con `REMOTION_BROWSER_EXECUTABLE`. Si no hay ninguno, Remotion descarga el suyo.
