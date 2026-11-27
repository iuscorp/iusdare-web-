# 10 · Flujo obligatorio para cada video nuevo

Entrada: **raw footage + brief** y, si hace falta, recursos adicionales.
Estados (`edit.meta.status`): `analisis` → `canvas` → **`aprobado`** → `edicion` → `revision` → `final`.

```bash
npm run studio:new -- 2026-12-caso-clinica-datos --source ~/Descargas/raw.mp4 --title "Caso clínica: filtración de datos"
```

## PASO 1: Analizar el material

```bash
npm run studio:analyze -- <slug> --apply-captions
```

Se revisa `projects/<slug>/analysis/analysis.md`:

- características técnicas (resolución, fps, códec, rotación);
- calidad de imagen (exposición y nitidez por segundo) y de audio (LUFS, peak);
- pausas, muletillas, repeticiones y tomas falsas;
- transcripción con tiempos por palabra.

Después, a mano y sobre la hoja de contacto:

- encuadre, composición y línea de los ojos, que se anota como `framing.focusY`;
- caja del rostro, que se anota en `layout.faceTop` y `layout.faceBottom`;
- momentos relevantes.

**Verificar la transcripción contra el guion o brief:** cifras, nombres y normas. Las correcciones se hacen en `captions.words` o en `captions.replace`, y los términos nuevos se agregan a `brand/glossary.json`.

## PASO 2: Comprender el contenido y su loop de retención

Completar `story` en `edit.json` respondiendo:

- ¿Qué problema plantea?
- ¿Por qué debería importarle al público?
- ¿Qué riesgo, oportunidad o consecuencia hay?
- ¿Qué pregunta mantiene abierta la atención?
- ¿Qué solución, aprendizaje o conclusión entrega?

Con esas respuestas se definen los `segments`: orden, `in`/`out` en los huecos entre palabras, `role`, `purpose`, encuadre, `nativeCodes` y `rationale`. Cada cambio de ritmo o recurso tiene que responder a una necesidad concreta de comprensión o retención (ver `04-codigos-nativos.md`).

### PASO 2b: Solo la voz en pantalla, sin silencios (obligatorio)

```bash
npm run studio:tighten -- <slug>          # --min-f0 150 por defecto (presentadora). Para un presentador hombre: --min-f0 0 --max-f0 165
```

Este paso:

- divide cada segmento en sus islas de voz y elimina los silencios de más de 0,22 s;
- descarta la voz fuera de cámara según el tono (pYIN);
- alterna la escala ±4 % en cada micro-corte.

Revisa el informe. Si un tramo de la presentadora queda marcado por error (por ejemplo, un final de frase grave), márcalo con `"keepVoice": true`.

```bash
npm run studio:clean -- <slug>            # quita voces y ruido de fondo; crea <raw>.clean.mp4 y apunta el EDL a él
```

## PASO 3: Planificar y buscar el B-roll

1. Declarar los slots de `broll[]` (frase, concepto, función, descripción y búsqueda) **desde el guion**.
2. Ejecutar `npm run studio:broll -- needs <slug>`.
3. Buscar con los conectores y fuentes disponibles (biblioteca, Drive, stock, Canva, IA) y evaluar relevancia, calidad y licencia.
4. Registrar con `add` y asignar con `assign` (ver `05-sistema-b-roll.md`).

## PASO 4: Canvas visual de la preview (OBLIGATORIO)

```bash
npm run studio:canvas -- <slug>
```

El resultado es `canvas/<slug>/index.html`: una página autocontenida con **capturas reales** del raw y de la composición renderizada. Incluye:

- vista general (métricas, loop y timeline de 3 pistas);
- A. secuencia narrativa;
- B. cortes y encuadres (original vs. propuesta);
- C. códigos nativos;
- D. B-roll (con timestamp, frase, función, recurso y fuente);
- E. textos y MG;
- F. audio y ritmo;
- la checklist de validación.

Se comparte con el equipo (por ejemplo, publicándolo como Artifact) y se pasa `meta.status` a `"canvas"`.

## PASO 5: Esperar la validación de la dirección creativa

**No se continúa sin aprobación.** Los cambios pedidos se aplican al EDL y se regenera el canvas. Con la aprobación, se pasa a `meta.status: "aprobado"`. El render final se niega a correr si el canvas no existe o si el estado no está aprobado.

## PASO 6: Edición completa

1. Cortes directos y eliminación de fragmentos innecesarios (segmentos).
2. Reencuadres y acercamientos (framing).
3. B-roll integrado (slots asignados).
4. Códigos nativos, textos y MG.
5. Audio: ganancia, música y SFX.
6. Revisión del ritmo en Remotion Studio (`npm run dev`) o con `--preview --hud`.

```bash
npm run studio:render -- <slug> --preview          # previews/<slug>/…-preview-vN.mp4
```

## PASO 7: Revisión visual y ajustes

Se reproduce la preview **completa, con audio**. Se ajusta el EDL y se vuelve a renderizar. Para un tramo puntual: `--frames 300-480`.

## PASO 8: Exportación final y control de calidad

```bash
npm run studio:render -- <slug>                    # exports/<slug>/…-final-vN.mp4 + .qc.md + .qc-sheet.jpg
```

Se completa la checklist humana de `11-control-de-calidad.md`. **Un video no está terminado porque compila:** se reproduce y se revisa entero. Al terminar, `meta.status: "final"`.
