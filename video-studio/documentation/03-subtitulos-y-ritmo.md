# Subtítulos, ritmo y limpieza de silencios

## Limpieza (scripts/lib/edit.mjs)
| Regla | Valor | Origen |
|---|---|---|
| Hueco máximo entre palabras | 0.30 s | REF (máx. observado en 5 piezas) |
| Aire antes / después de cada corte | 0.08 / 0.09 s | evita cortar ataques y colas |
| Pausa conservada antes de veredicto («ilegal», «delito», «depende», «nunca», «nadie») o tras pregunta | ≤ 0.45 s | REF |
| Muletillas eliminadas automáticamente | eh, em, mm, ehm, ajá | — |
| Muletillas sólo señaladas | este, bueno, o sea, pues, entonces, digamos | pueden tener función («o sea» traduce) |
| Tomas repetidas | misma frase iniciada 2 veces en < 25 s → se conserva la ÚLTIMA | práctica de grabación |
| Tartamudeo | palabra corta repetida («el el») | — |
| Primera palabra | en el frame 0 | REF |

Precisión de los cortes: Whisper tiende a estirar palabras sobre los silencios; el estudio cruza
sus marcas con la detección acústica de FFmpeg (`refineWithSilences`) y alinea cada corte a la
rejilla de fotogramas. Nunca se corta dentro de una palabra.

## Reencuadre para ritmo
Los rangos limpios se dividen en sub-planos de 1.2–2.5 s en límites de palabra (preferentemente
al final de frase). Cada corte alterna `base` ↔ `subtleIn`; la revelación y los giros llevan
`punchIn`; el CTA vuelve a `base`.

## Subtítulos
- 1 palabra por vez, desde el inicio de la palabra hasta el inicio de la siguiente (sin huecos).
- Minúsculas salvo siglas y números; signos de puntuación eliminados.
- Énfasis (+12 % y micro-pop) en: ilegal, derecho(s), delito, ley, constitución, prohibido,
  denunciar/denuncia — ampliable por proyecto (`emphasisExtra`).
- Se ocultan mientras hay una palabra cinética o letra gigante en pantalla (REF).
- La altura sube con el zoom para no pisar la cabeza.
- **Ortografía**: `templates/glossary.json` corrige automáticamente errores reales observados
  (p. ej. «Bocari Yuris» → «Vocare Iuris», «intercopy» → «Indecopi», números de ley partidos).
  Añadir cada nuevo error al glosario. El QC compara el subtítulo con una re-transcripción del
  render y lista las discrepancias.
