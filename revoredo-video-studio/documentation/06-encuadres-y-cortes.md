# 06 · Encuadres, acercamientos y cortes

Código: `src/framing/presets.ts` y `src/framing/Reframe.tsx`.

## Análisis del raw (PASO 1)

Para cada fuente se revisa y se anota en `analysis.md` / `edit.json`:

- **Composición y posición del presentador:** si está centrado o en tercios, y si hay espacio negativo arriba o a los lados.
- **Línea de los ojos:** se mide la altura de los ojos (fracción del alto) y se usa como `focusY` de los reencuadres.
- **Caja del rostro:** `layout.faceTop` y `layout.faceBottom` (fracciones del alto). Con estos valores se calcula dónde pueden ir los gráficos sin tapar la cara. En la referencia los valores son 0,27 / 0,46.
- **Calidad del encuadre y margen de reencuadre:** con un raw de 720 px y salida de 1080 px ya hay un escalado de ×1,5, así que conviene limitar el punch-in. El análisis lo advierte automáticamente.

## Presets

| Preset | Escala | Uso |
|---|---|---|
| `wide` | ×1,00 | Encuadre original. Establecer, dar aire, relato |
| `medium` | ×1,12 | Plano de conversación por defecto |
| `close` | ×1,24 | Énfasis: dato clave, consecuencia, antihook |
| `extreme` | ×1,32 | 1 o 2 veces por video: hook o reveal |
| `custom` | `scale` | Casos especiales |

Además del preset, cada segmento puede tener un **zoom animado** (`zoomFrom` → `zoomTo`, p. ej. 1 → 1,05) con easing suave. El zoom se centra en el punto de foco y **nunca deja ver los bordes**, porque la traslación está limitada. El tope global es `motion.maxPunchIn`.

## Cortes

1. **El corte directo es la norma** (`transitionIn: "cut"`).
2. **Cada corte cambia la escala** respecto del segmento anterior, para que el jump-cut se lea como cambio de plano. El canvas marca ⚠ cuando dos segmentos consecutivos tienen casi la misma escala.
3. Se corta **en el silencio entre palabras** (huecos de `analysis.md`), nunca a mitad de sílaba. Se dejan 2–4 fotogramas de aire antes de la primera palabra.
4. Se eliminan muletillas, repeticiones y tomas falsas: el análisis las detecta como frases repetidas en una ventana de 12 s.
5. **Acentos de corte** (`flash`, `light-leak`, `dip`): se superponen al corte, no son fundidos. Solo se usan al entrar en un bloque nuevo, normalmente un B-roll.
6. Hay que revisar el raw para detectar **fotogramas oscuros o negros** junto a los puntos de corte (el QC los detecta).

## Acercamientos

- **Generan énfasis sin sentirse artificiales:** el zoom continuo no pasa del 6 % por segmento, y los saltos de escala se hacen en el corte, no a mitad de frase.
- Como máximo, 3 o 4 acercamientos fuertes por video.
- No se deforma nunca al presentador: la escala es uniforme y no se estira.
- Si el raw tiene poca resolución o nitidez, se prefiere `medium`/`close` y se evita `extreme`.
