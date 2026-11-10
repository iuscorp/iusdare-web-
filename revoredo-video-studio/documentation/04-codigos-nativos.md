# 04 · Códigos Nativos y metodología de retención

## Nota sobre las fuentes

Los **Códigos Nativos** son parte de la metodología de pago de Guille Collado. Aparecen en los programas *Hackeando el Algoritmo* (“los 8 códigos nativos para dominar el lenguaje de la plataforma”, “la estructura perfecta de un vídeo”) y *Hackeando la Edición* (“Avanzado → Edición creativa con códigos nativos”; ritmo, cortes y estructura “para retener y viralizar”).

Las páginas públicas consultadas mencionan el concepto, pero **no publican la lista ni las definiciones** de los ocho códigos. Por eso este documento no inventa una lista atribuida al autor. Lo que sí hace:

1. Toma el **principio** que comunica la metodología: los códigos nativos son el *lenguaje propio de la plataforma* (ritmo, cortes, estructura y narrativa). No son efectos visuales.
2. Lo traduce en criterios operativos para los recursos pedidos en el brief del estudio: hook, reveal, antihook, build-up, pattern interrupt, match cut, cambios de encuadre y escala, zooms sutiles, textos estratégicos, estímulos visuales y auditivos, cambios de ritmo y loops de retención.
3. Contrasta cada criterio con lo que hace la referencia de Revoredo (ver `references/revoredo-caso-gimnasio-biometria/analisis.md`).

> **Pendiente:** si el equipo tiene acceso al curso, conviene agregar aquí la lista oficial de los 8 códigos y mapearla a la tabla de abajo. El sistema ya está preparado: los códigos se declaran en `nativeCodes` de cada segmento (`src/schema/edit.ts`) y se describen en `scripts/lib/vocab.ts`.

Fuentes consultadas:
[Hackeando la Edición (Skool)](https://www.skool.com/hackeando-la-edicion/about) ·
[Hackeando el Algoritmo 2.0](https://masterlibre.com/product/hackeando-el-algoritmo-guille-collado/) ·
[Programa Hackeando el Algoritmo](https://guillermocollado.com/hackeando-el-algoritmo/) ·
[Grupo Beta](https://guillermocollado.com/grupo-beta/)

---

## La regla de oro

Todo recurso tiene que responder a esta pregunta:

> **¿Qué problema de comprensión o de retención resuelve este cambio?**

Si la respuesta no es clara, el recurso no se usa. La retención sale de la historia, no del efecto:

**Problema → tensión → desarrollo → solución o aprendizaje → CTA**

Esta estructura sirve como guía de análisis. Si el contenido pide otra narrativa (explicativo, lista, opinión), se adapta, pero siempre con una **pregunta abierta** que se cierra al final.

## Catálogo de códigos aplicados al estilo Revoredo

| Código (`nativeCodes`) | Problema que resuelve | Aplicación corporativa (sí) | Evitar (no) |
|---|---|---|---|
| `hook` | Abandono en 1–3 s | Pregunta en segunda persona, o dato y riesgo nombrado. Plano close. | Clickbait, gritos, zoom brusco, emojis |
| `antihook` | Predictibilidad | Negar la hipótesis obvia con un hecho (“el problema no fue la biometría”) | Contradecir sin sustento |
| `open-loop` | No hay motivo para seguir viendo | Anticipar la clave sin revelarla (“algo que casi ninguna empresa hace bien”) | Promesas que el video no cumple |
| `build-up` | Monotonía en el desarrollo | Acumular evidencia (cifra → autoridad → sanción) acortando los planos | Listar datos sin escalar la gravedad |
| `reveal` | Falta de recompensa | Frase clave + punch-in a close/extreme + pausa de 0,2 s | Efecto de sonido estridente o flash |
| `payoff` | Cierre sin aprendizaje | Regla práctica en positivo (KeyPoints) | Moraleja genérica |
| `retention-loop` | El final no conecta con el inicio | El CTA retoma la palabra del hook (“datos sensibles”) | CTA desconectado del tema |
| `pattern-interrupt` | Habituación tras 3–7 s del mismo plano | Corte a B-roll pertinente o cambio de escala | Glitches, shakes, memes |
| `match-cut` | Saltos bruscos entre ideas | Unir por palabra, forma o acción (“membresía” → gimnasio) | Match forzado o confuso |
| `reframe` | Jump-cut en una toma única | Reencuadre digital al cambiar de frase | Reencuadres sin corte (parece error de cámara) |
| `scale-change` | Planos iguales consecutivos | Alternar medium ↔ close en cada corte | Tres planos seguidos con la misma escala |
| `punch-in` | La frase clave no destaca | Zoom lento (≤ 6 % en el segmento) o salto de preset | Zooms rápidos, con rebote o en todas las frases |
| `strategic-text` | Ideas complejas o cifras que se pierden | Máx. 7 palabras, serif, un único acento dorado | Repetir el subtítulo, párrafos |
| `visual-stimulus` | Caída de atención en bloques explicativos | Línea dorada, dato o B-roll minimalista | Stickers, iconos decorativos |
| `audio-stimulus` | Un cambio de bloque pasa desapercibido | Whoosh o tick suave bajo la voz (≤ 0,4) | SFX en cada corte, sonidos cómicos |
| `rhythm-change` | Ritmo plano en todo el video | Acelerar en el build-up y dar aire al payoff | Ritmo frenético constante |

## Densidad recomendada (reel de 45–60 s)

- **Cambio visual** (corte, B-roll o gráfico) cada 2,5–4 s. Nunca más de 7 s sin cambio.
- **B-roll:** de 4 a 7 piezas, entre el 25 % y el 40 % del tiempo.
- **Textos o MG:** de 3 a 6, solo en cifras, requisitos, autoridades y la frase del antihook o reveal.
- **Punch-ins fuertes** (close/extreme): de 3 a 4 como máximo. Si todo se enfatiza, nada destaca.
- **Acentos de corte** (flash): solo en entradas de bloque, con un máximo de uno cada 6 s.
- **SFX:** de 0 a 4 por video.

## Cómo se registra en cada edición

Cada segmento del EDL declara:

```json
{
  "nativeCodes": ["antihook", "punch-in"],
  "rationale": "Se niega la hipótesis obvia; el acercamiento marca la frase como giro."
}
```

El canvas (sección C) muestra para cada momento:

- el código;
- el **porqué** (`rationale`);
- el problema que resuelve y la aplicación corporativa (`scripts/lib/vocab.ts`).
