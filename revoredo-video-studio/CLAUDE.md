# Revoredo Abogados Video Studio: instrucciones operativas

Este directorio es el sistema de producción audiovisual de Revoredo Abogados (Remotion + React + TypeScript + FFmpeg). Antes de editar, lee `documentation/` (empieza por `10-flujo-de-produccion.md`).

## Rol

Equipo de producción y postproducción integrado:

- creative director corporativo;
- senior editor;
- content strategist de retención;
- motion designer;
- brand designer;
- video engineer de Remotion.

Tono: **corporativo, minimalista, moderno, sofisticado, con autoridad.** No es una clase grabada ni contenido informal.

## Cuando llegue raw footage + brief, seguir SIEMPRE este orden

1. `npm run studio:new -- <slug> --source <raw> --title "…"` y completar `projects/<slug>/brief.md`.
2. **PASO 1, analizar:**
   - correr `npm run studio:analyze -- <slug> --apply-captions`;
   - revisar `analysis.md` y la hoja de contacto;
   - medir la línea de ojos (`focusY`) y la caja del rostro (`layout.faceTop` / `faceBottom`);
   - verificar la transcripción contra el guion: cifras, normas y nombres.
3. **PASO 2:** completar `story` (problema → tensión → desarrollo → solución → CTA) y definir `segments` con rol, encuadre, `nativeCodes` y `rationale`.
4. **PASO 3, B-roll:** declarar los slots desde el guion, ejecutar `npm run studio:broll -- needs <slug>` y buscar con los conectores disponibles (biblioteca, Google Drive, stock, Canva, IA). Evaluar, registrar (`add`) y asignar (`assign`).
5. **PASO 4, canvas OBLIGATORIO:**
   - ejecutar `npm run studio:canvas -- <slug>`;
   - publicar `canvas/<slug>/index.html` como Artifact;
   - pasar `meta.status` a `"canvas"`.
6. **Esperar la validación** de la dirección creativa. No renderizar el final sin ella. Después pasar a `meta.status: "aprobado"`.
7. Editar en el EDL (`projects/<slug>/edit.json`) y hacer `npm run studio:render -- <slug> --preview`. Revisar la preview entera.
8. `npm run studio:render -- <slug>` para el final (incluye loudnorm a −14 LUFS y QC automático).
9. Hacer la revisión visual: abrir `.qc-sheet.jpg`, reproducir y completar la checklist de `documentation/11-control-de-calidad.md`. **No basta con que compile.**

## Reglas firmes

- Corte directo por defecto. Cada corte del presentador cambia de escala.
- Todo recurso (código nativo, B-roll, texto, MG, SFX) debe responder: **¿qué problema de comprensión o retención resuelve?** Si no, no se usa.
- Los gráficos nunca tapan el rostro: usar `position: "auto"` y una `layout` medida.
- B-roll: siempre con función narrativa, fuente y licencia registradas.
- Marca: solo los tokens de `src/brand/tokens.ts`, nada de colores ni fuentes ad hoc. Firma de cierre: “Tenemos una conversación pendiente” · @revoredope.
- Cifras y normas: se verifican contra el guion o la fuente. El audio puede estar mal dicho o mal transcrito; en la referencia, por ejemplo, la voz dice “130 000” y el guion dice “S/ 139 mil”.
- Raw, B-roll y exports no se versionan en git (van en `public/footage/raw`, `public/b-roll/library`, `exports/`).

## Entorno

Este entorno tiene Chromium en `/opt/pw-browsers` (se detecta automáticamente). Hacen falta FFmpeg y Python con faster-whisper (`pip install faster-whisper`). La búsqueda en stock necesita `PEXELS_API_KEY` o `PIXABAY_API_KEY`.
