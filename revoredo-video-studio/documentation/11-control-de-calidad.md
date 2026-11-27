# 11 · Control de calidad

## Automático (`scripts/qc.ts`, corre con cada render final)

| Check | Criterio |
|---|---|
| Resolución / FPS / duración | Coinciden con el EDL |
| Códec | H.264 yuv420p (rango TV, BT.709) + AAC 48 kHz |
| Sincronía A/V | Las duraciones de los streams de audio y video difieren en ≤ 1 fotograma |
| Fotogramas negros | Ninguno en el cuerpo del video (blackdetect) |
| Imagen congelada | Ninguna de más de 1,5 s (freezedetect) |
| Silencios | Ninguno de más de 1,2 s en el cuerpo |
| Loudness | −14 ± 1 LUFS y true peak ≤ −1 dBTP |
| Ortografía | Tildes frecuentes (protección, información, sanción…) y espacios dobles. Lista completa del texto en pantalla para revisión humana |

Salidas: `<video>.qc.md`, `<video>.qc.json` y `<video>.qc-sheet.jpg` (hoja de contacto a 1 fps).

## Humano (obligatorio antes de entregar)

**Identidad**

- [ ] ¿El video se siente coherente con Revoredo Abogados?
- [ ] ¿Mantiene un estilo corporativo y premium?

**Retención**

- [ ] ¿Cada recurso visual tiene una función?
- [ ] ¿El loop de retención se sostiene (la pregunta abierta se cierra)?
- [ ] ¿Los códigos nativos se usan con estrategia y sin saturar?

**B-roll**

- [ ] ¿Cada B-roll tiene una función narrativa?
- [ ] ¿Es relevante para lo que se dice en ese momento?
- [ ] ¿Su calidad es adecuada y la licencia está registrada?
- [ ] ¿Está integrado con naturalidad (tiempos y color)?

**Edición**

- [ ] ¿Los cortes directos mantienen la continuidad (sin cortar sílabas ni respiraciones a medias)?
- [ ] ¿Los acercamientos se sienten naturales?
- [ ] ¿El ritmo es adecuado?
- [ ] ¿Ningún gráfico tapa el rostro?

**Técnica**

- [ ] ¿Audio y video están sincronizados (labios en planos close)?
- [ ] ¿No hay fotogramas negros?
- [ ] ¿Los textos se leen en un móvil?
- [ ] ¿No hay errores ortográficos? ¿Las cifras y normas coinciden con el guion?
- [ ] ¿La calidad final es correcta (sin banding ni pixelado en los reencuadres)?
