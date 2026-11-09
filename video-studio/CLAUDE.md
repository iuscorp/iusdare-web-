# Vocare Iuris Video Studio — instrucciones para Claude

Cuando el usuario entregue **raw footage + brief**, seguir SIEMPRE este flujo, sin saltar pasos:

1. **ANÁLISIS** — `npm run new -- <slug> <raw> --title "…"` y `npm run analyze -- <slug>`. Leer `analysis/analysis.md` y la transcripción completa.
2. **ESTRUCTURA NARRATIVA** — `npm run draft -- <slug>`. Mapear el discurso a los 8 bloques de `references/REFERENCE_ANALYSIS.md` (hook → revelación → base legal → traducción → giro → qué hacer → cierre en bucle → CTA). Evaluar todo desde alguien que no estudió Derecho. No cambiar el contenido sustancial; proponer reordenamientos con justificación.
3. **CÓDIGOS NATIVOS** — afinar `edl.json`: cada recurso con función narrativa (`documentation/05-codigos-nativos.md`). Textos legales exactos desde el brief, nunca desde la transcripción. Revisar los avisos `note` y `auto: true`.
4. **CANVAS** — `npm run canvas -- <slug>` (NO colorear: `colorPreset: "none"` salvo pedido explícito). Mirar las capturas del canvas (incluidos los fotogramas renderizados) antes de presentarlo.
5. **APROBACIÓN** — presentar el canvas y ESPERAR la aprobación explícita del usuario. Sólo entonces `npm run approve -- <slug> "nota"`. Si pide cambios: actualizar EDL y canvas.
6. **EDICIÓN COMPLETA** — `npm run render -- <slug> --preview`, revisar, corregir, luego `npm run render -- <slug>`.
7. **CONTROL DE CALIDAD** — leer `qc/qc-report.md` y MIRAR `qc/contact-sheet.jpg` y fotogramas a resolución completa. No dar por terminado algo sólo porque compila o el QC automático pasa.
8. **EXPORTACIÓN** — entregar `exports/<slug>/<slug>.mp4` con el informe de QC.

Reglas:
- Fidelidad a las referencias: no inventar estilo nuevo; los valores [REF] de `src/brand/tokens.ts` no se cambian sin pedirlo.
- Veredicto: sello de impacto `verdictStamp` («ESO ES ILEGAL» junto) con riser → stamp → fahhh.
- SFX de marca: pop, click, poi, kiran, fahhh, risers (ver documentation/02-componentes.md).
- Emojis: siempre estilo iOS. Textos de impacto pueden ir detrás del presentador (`behindPerson`).
- **Sólo se monta voz del presentador EN CÁMARA.** En sesiones en bruto hay una voz detrás de cámara que dicta las frases: nunca usar esas tomas. `analyze` mide labios + voz (`speaker-activity.json`) y valida cada tramo (`hablante: N/N`); revisar cualquier aviso `off-camera-voice` antes del canvas. Con `npm run analyze` la línea de tiempo N/d/. de cada tramo queda en `cleanup.json → speaker`.
- Sesiones largas con varias tomas: elegir la mejor toma de cada frase en `projects/<slug>/selects.json` (orden de guion). Cada toma se transcribe por separado; `skipFirst` descarta palabras iniciales ajenas.
- Subtítulos: siempre siguen la cabeza del presentador (`headTrack`). Verificar en fotogramas reales.
- No afirmar que el preset de color replica exactamente el ajuste «Combinación visual» de CapCut: es una réplica comparativa.
- Precisión jurídica por encima del efecto.
- Footage, previews y exports no se suben al repositorio (`.gitignore`).
- Tipografías de marca: DM Sans Bold (subtítulos), Poppins y Druk Wide (textos en pantalla). Si falta `public/fonts/DrukWide-*`, avisar al usuario de que se está usando el sustituto.
- Nuevos errores de transcripción → añadirlos a `templates/glossary.json`.
- Entorno: Whisper en `.venv` (`npm run setup:python`); necesita acceso a huggingface.co la primera vez para descargar el modelo.
