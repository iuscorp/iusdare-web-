# 12 · Prueba integral del sistema

**Objetivo:** validar el pipeline completo (análisis → EDL → canvas → preview → final → QC) con material real. No es una edición entregable.

**Material:** el video de referencia (caso gimnasio y biometría) usado como si fuera un raw. Por eso, en las capturas se ven dos veces los subtítulos y el bug: los que ya traía incrustados la referencia y los del estudio. Con un raw limpio solo aparecen los del estudio.

**EDL usado:** `references/revoredo-caso-gimnasio-biometria/edl-prueba-sistema.json`. Tiene 16 segmentos, 9 motion graphics, 2 slots de B-roll (uno asignado y otro pendiente, para probar el placeholder) y el end card.

## Resultados

| Paso | Resultado |
|---|---|
| `studio:new` | Proyecto y estructura creados; raw copiado |
| `studio:analyze` | Ficha técnica, loudness (−14,6 LUFS), 4 cambios visuales, transcripción de 174 palabras en unos 30 s. Alertas: raw de 720 px y nitidez baja en B-roll con movimiento |
| Transcripción | Tiempos verificados contra el video (p. ej. “la usuaria” a 36,1 s). Errores típicos corregidos contra el guion: “reboreado” → Revoredo, “130 000” → S/ 139 mil, “27.8” → 27 UIT, “sosia” → socia |
| `studio:canvas` | 64 capturas reales renderizadas en unos 60 s. HTML autocontenido con las secciones A–F |
| `studio:render --preview` | 540p en unos 90 s |
| `studio:render` (final) | 1080×1920 en unos 2 min 40 s, con loudnorm a −14 LUFS / −1 dBTP |
| QC | 10/10 checks automáticos en verde, más hoja de contacto revisada a mano |

## Problemas que detectó el sistema y se corrigieron

1. **Fotogramas negros** en 00:28: el clip de mancuernas de la referencia termina en negro. El QC los detectó y se corrigió el `in` del segmento S11.
2. **Rango de color yuvj420p** (rango completo): poco compatible con algunas plataformas. Se fijó `colorSpace: bt709` y el resultado es yuv420p en rango TV.
3. **Audio 0,1 s más largo que el video** después de la normalización. Se agregó `-shortest` y ahora la diferencia de sincronía A/V es ≤ 1 fotograma.
4. **Gráficos sobre el rostro:** en la revisión visual, las tarjetas tapaban la cara en planos close. Se creó el sistema de zonas sin rostro (`src/lib/layout.ts` + `edit.layout`) y la posición `auto` por defecto.
5. **Números partidos por Whisper** (“7” “.132”): ahora los subtítulos los unen automáticamente.

## Cómo repetir la prueba

```bash
npm run studio:new -- prueba-sistema-referencia --source <video-referencia.mp4>
npm run studio:analyze -- prueba-sistema-referencia
cp references/revoredo-caso-gimnasio-biometria/edl-prueba-sistema.json projects/prueba-sistema-referencia/edit.json
npm run studio:canvas -- prueba-sistema-referencia
npm run studio:render -- prueba-sistema-referencia
```
