# 08 · Biblioteca de motion graphics

Código: `src/motion-graphics/`. Para revisar toda la biblioteca: `npm run studio:showcase` → `previews/_library/library-showcase.mp4`.

Cada elemento tiene que cumplir al menos una de estas funciones: **1) comprensión, 2) énfasis, 3) retención**. En el EDL se declara en `graphics[].function`. Si no cumple ninguna, no se usa.

| Componente | Función | Props principales | Cuándo usarlo |
|---|---|---|---|
| `StrategicText` | Énfasis / comprensión | `text`, `emphasis`, `kicker`, `size` | La frase del hook, antihook o reveal (≤ 7 palabras) |
| `DataCard` | Comprensión + énfasis | `value`, `prefix`, `suffix`, `label`, `note`, `countUp` | Multas, UIT, número de afectados, plazos |
| `KeyPoints` | Comprensión | `title`, `items[]`, `mode` (check / number / cross), `revealAt[]` | Requisitos o pasos, sincronizados con la voz |
| `LegalReference` | Comprensión (autoridad) | `reference`, `authority`, `detail` | Cuando se nombra una norma o una autoridad |
| `QuoteCard` | Comprensión (autoridad) | `quote`, `attribution` | Cita literal breve de una resolución o norma |
| `LowerThird` | Autoridad | `name`, `role` | Una vez, entre 3 y 6 s después del hook |
| `AccentLine` | Retención | `y`, `length` | Marcar un cambio de beat sin agregar texto |
| `CTAEndCard` | Retención y conversión | `line`, `action`, `handle` | Cierre. Se agrega automáticamente desde `endCard` |

## Colocación sin tapar el rostro

Todos los componentes de tarjeta usan `position: "auto"` por defecto. El template calcula la franja libre (`src/lib/layout.ts`) con dos datos:

- la caja del rostro del raw (`edit.layout`);
- el reencuadre del segmento que está debajo.

Con eso, centra el gráfico sobre la cabeza o entre el mentón y los subtítulos, según cuál franja sea más grande. Sobre un B-roll a pantalla completa usa la mitad superior. También se puede forzar `upper`, `center` o `lower`.

Las tarjetas altas (`KeyPoints` con 3 ítems o más, `DataCard` con nota) se colocan sobre segmentos `medium`/`wide` o sobre B-roll. En planos `close`, la franja libre es menor.

## Tono: fondos claros vs. oscuros

Si el set es claro (por ejemplo, una pared blanca detrás de la cabeza), en `edit.json` se pone `layout.backdrop: "light"`. Con eso, `StrategicText` pasa a texto tinta con énfasis en dorado oscuro.

Sobre B-roll siempre se usa texto claro. Un texto no debe cruzar el límite entre presentador y B-roll: se termina antes o se divide en dos. También se puede forzar el tono por gráfico con `tone: "light" | "ink"`.

## Uso en el EDL

```json
{
  "id": "G02",
  "component": "DataCard",
  "start": 4.84, "end": 7.28,
  "function": "comprension",
  "props": { "prefix": "S/ ", "value": 139, "suffix": " mil", "label": "Multa a un gimnasio arequipeño", "note": "ANPD · 2026" },
  "rationale": "La cifra concreta convierte el riesgo en consecuencia."
}
```

Los tiempos están en segundos del **raw** (`clock: "source"`), así que siguen a la frase aunque se reordenen o recorten los segmentos.

## Agregar un componente nuevo

1. Crear `src/motion-graphics/MiComponente.tsx`. Usar `Stage`, `Card` y `GoldRule` de `primitives.tsx`, los tokens de `tokens.ts` y `useEnvelope`/`useStagger` de `lib/anim.ts`.
2. Registrarlo en `src/motion-graphics/index.ts` y en el enum `graphicComponent` de `src/schema/edit.ts`.
3. Agregarlo a `LibraryShowcase.tsx` y documentarlo aquí.
