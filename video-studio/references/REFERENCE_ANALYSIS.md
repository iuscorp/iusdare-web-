# Ingeniería inversa de las referencias — lenguaje audiovisual Vocare Iuris

**Material analizado:** 5 videos de la carpeta OneDrive «Videos referencia vocare iuris».

| ID | Tema | Presentador/a | Duración | Palabras | Palabras/s |
|---|---|---|---|---|---|
| `20261024` (.MOV) | Comisiones bancarias no informadas | Hombre, polo rosado | 36.5 s | 121 | 3.35 |
| `2E10B7C0` | Cabello pintado en el colegio | Mujer, polo a rayas | 36.9 s | 131 | 3.63 |
| `37A874D2` | Detención sin orden judicial / flagrancia | Mujer, blazer negro | 35.4 s | 117 | 3.32 |
| `41ABE5F8` | Cargos de confianza (Ley 30057) | Mujer, top negro | 52.2 s | 165 | 3.17 |
| `92E3A94E` | Acoso sexual en el colegio (Ley 29719) | Mujer, polo marrón | 49.8 s | 179 | 3.61 |

**Cómo se midió:** `ffprobe` (técnica), diferencia entre fotogramas + estimación de escala por
correspondencia de puntos ORB (cortes y reencuadres), hojas de contacto a 1 fps y 6 fps (revisión
visual), estadísticas Lab/HSV por fotograma (color), EBU R128 + espectrograma (audio) y Whisper
con marcas por palabra (ritmo y estructura). Archivos de soporte en `references/analysis/`,
`references/frames/` y `references/transcripts/`.

Leyenda: **[REF]** constante observada · **[VAR]** varía entre piezas · **[?]** no verificable con certeza.

---

## A. Lenguaje audiovisual

| Elemento | Hallazgo | Estándar del estudio |
|---|---|---|
| Formato | 1080×1920, 30 fps, HEVC, AAC 44.1 kHz en las 5 [REF] | Render 1080×1920 / 30 fps / H.264 |
| Cámara | Una sola cámara fija en trípode, frontal, a la altura del pecho. Sin B-cam [REF] | Plano único reencuadrado en edición |
| Plano base | Plano medio-largo: de rodillas a cabeza, presentador sentado en sofá, centrado [REF] | `FRAMING.base` |
| Espacio negativo | 18–28 % superior de pared lisa clara sobre la cabeza: es donde vive el subtítulo [REF] | Subtítulo en y ≈ 0.215 |
| Micrófono | Micrófono inalámbrico de solapa sostenido en la mano a la altura de la boca (visible, gesto nativo) [REF] | Recomendado en grabación |
| Cortes | Sólo jump cuts / cortes directos; ninguna transición de fundido o barrido [REF] | Sin transiciones |
| Frecuencia | Un cambio visual (corte con reencuadre o aparición gráfica) cada **1.2–2.2 s** de media [REF] | Sub-planos de 1.2–2.5 s |
| Reencuadre | Alternancia de escala entre ~0.92× y ~1.08× en cortes consecutivos [REF] | `base` ↔ `subtleIn` |
| Punch-in | 1.10–1.17× en la frase clave («pero eso es ilegal», 41ABE5F8 a 8.5 s) [REF] | `punchIn` |
| Crash zoom | Hasta ~1.4× sobre el rostro, 1–1.5 s, al inicio (41ABE5F8 2.0–3.4 s) [VAR] | `crash` (máx. 1 por video) |
| Primer fotograma | La voz arranca en el frame 0 en las 5 piezas: sin intro, sin logo, sin cortinilla [REF] | `RHYTHM.firstWordAt = 0` |
| Final | Termina con la última palabra del CTA; cola < 0.5 s [REF] | Sin end card |

## B. Subtítulos y tipografía

| Elemento | Hallazgo |
|---|---|
| Unidad | **Una sola palabra** en pantalla, cambia exactamente con la voz [REF] |
| Caja | Minúsculas siempre (salvo siglas/números) [REF] |
| Familia | **DM Sans Bold** (confirmado por Vocare Iuris), inclinada en las referencias → DM Sans Bold Italic |
| Color | Amarillo saturado ≈ `#FFE61B` [REF] |
| Efecto | **Glow amarillo** difuso alrededor + sombra corta oscura [REF] |
| Tamaño | ≈ 58–64 px de cuerpo a 1080 px de ancho (pequeño: no compite con el rostro) [REF] |
| Posición | Centrado, en el espacio negativo **sobre la cabeza** (y ≈ 19–28 %), sube cuando el plano se cierra [REF] |
| Animación | Ninguna perceptible: corte seco palabra a palabra [REF] |
| Destacados | No hay cambio de color por palabra clave; el énfasis se hace con gráficos aparte [REF]. El micro-pop de palabras clave del estudio es **[REC]** |

Tipografías de textos en pantalla (confirmadas por Vocare Iuris): **Poppins** y **Druk Wide**.
- **Tarjetas de norma** («Ley 30057», «Ley 29719»): Poppins Bold grande, blanca o amarilla, sombra corta; se **escriben** con caret; subtítulo explicativo debajo («Ley del servicio civil», «(Ley Antibullying)») [REF].
- **Etiqueta seleccionada** («Inmediatez Temporal», «Ley del servicio civil»): Poppins SemiBold, crema, dentro de una caja azul de selección con tiradores y cursor de ratón; luego la caja desaparece y queda el texto [REF].
- **Título de revelación** («Eso es / ilegal»): serif display condensada de alto contraste, amarilla con glow, línea a línea [REF, sólo 92E3A94E]. No forma parte de las fuentes confirmadas → Playfair Display 900 comprimida [APROX], pendiente de confirmar.
- **Palabra cinética** («De / nun / ciar»): Druk Wide amarilla gigante, sílaba a sílaba, ocupa el lugar del subtítulo [REF, 92E3A94E].
- **Badges** («(+14)»): Poppins Bold amarillo con sombra [REF].

## C. Recursos visuales

| Recurso | Ejemplos | Función |
|---|---|---|
| Stickers emoji 3D | 🤨 😱 🫢 🤔 ♟️ 🙅‍♀️ 👮 👨‍🏫 🏫 🔍 🔞 🗣️ 🫠 👉 💲🏛️ | Actor o emoción de la situación; a la altura del pecho, al lado de la mano libre; pop de entrada, corte seco de salida [REF] |
| Ecuación de emojis | ⚙️ + ⏳ ∞ ? | Traducir un requisito («funciones permanentes») [REF] |
| Portadas de documentos | Código de Protección al Consumidor, Código Penal, Código de los Niños | Base legal visible con etiqueta amarilla [REF] |
| Logos institucionales | Indecopi (arriba-derecha) | Autoridad citada [REF] |
| Fotos de apoyo | Ejemplos de cabello pintado (recorte con borde, o imagen de fondo detrás del presentador) | Representar la situación cotidiana [REF, 2E10B7C0] |
| Aspa roja | ✖ que cruza de izquierda a derecha al decir «no» | Negación [REF] |

Regla observada: **nunca dos recursos grandes a la vez**; los recursos ocupan el tercio medio-inferior
(pecho/regazo) y dejan libres el rostro y el subtítulo.

## D. Tratamiento audiovisual

### Color («Combinación visual» de CapCut)
Estadísticas medias por fotograma (`references/analysis/color-stats.txt`):

| | L* medio | L* p1 | L* p50 | L* p99 | a* | b* | Sat. HSV |
|---|---|---|---|---|---|---|---|
| 4 exportaciones MP4 (media) | 52.6 | **0–2** | 60.8 | **89–94** | +4.4 | +3.7 | **0.22** |
| `20261024.MOV` | 55.2 | 5.1 | 60.4 | 82.3 | +4.9 | +2.4 | 0.15 |
| MOV + preset del estudio | 57.7 | 0.4 | 64.6 | 88.8 | +6.4 | +5.0 | 0.23 |

Lectura: **negros profundos**, **altas luces contenidas sin clipping**, saturación moderada, sesgo
**cálido** leve, piel luminosa, y un **glow/halación** suave visible en bordes de cabello y piel.
La pieza `.MOV` es más plana (negros levantados, menos saturación): se usó como "antes" para calibrar.
Ver `documentation/04-color.md`. **No se tuvo acceso a los parámetros del ajuste de CapCut: el
preset es una réplica comparativa, no una copia verificada.**

### Audio
- Loudness integrado muy variable: −17.5 a −25.5 LUFS [VAR] → el estudio normaliza a **−14 LUFS**.
- Voz limpia, sin efectos de tono ni reverberación añadida [REF].
- Cama musical: **no verificable**. En 4/5 piezas la cola tras la última palabra cae a −45/−59 dB (sin música sostenida); en 2E10B7C0 hay energía continua de banda baja [?].
- SFX: transitorios de banda ancha puntuales coincidentes con apariciones gráficas/zoom (espectrograma) → probable uso de *pops/whooshes* [?].

## E. Estrategias de retención (estructura narrativa)

Estructura idéntica en las 5 piezas [REF]:

| # | Bloque | Tiempo típico | Ejemplo literal |
|---|---|---|---|
| 1 | **Hook situacional en 2.ª persona** (pregunta o situación) | 0–3 s | «¿Revisaste tu estado de cuenta y apareció una comisión que nadie te explicó?» |
| 2 | **Revelación / antihook**: veredicto inmediato | 2–5 s | «Eso podría ser ilegal.» · «Esa es ilegal.» · «¿Es ilegal? Bueno, depende.» |
| 3 | **Base legal** citada con número | 5–15 s | «La Ley 30057 reconoce…» · «El artículo 176-B…» |
| 4 | **Traducción** a lenguaje claro | — | «Eso se llama principio de transparencia…» · «O sea…» |
| 5 | **Giro / pregunta del público** (loop abierto) | mitad | «Pero ¿realmente el colegio puede prohibirlo?» · «Pero hay una excepción» |
| 6 | **Qué hacer** (pasos) | — | «¿Y qué hacer? Primero, reclama… ¿No lo resuelven? Denuncia ante Indecopi.» |
| 7 | **Cierre en bucle**: repite el veredicto | −8 s | «Cobrarte algo que nunca fue informado es ilegal.» |
| 8 | **CTA fijo de marca** | −4 s | «Sigue a Vocare Iuris y guarda este video. No sabes cuándo podrás necesitarlo.» |

- Ritmo final 3.2–3.6 palabras/s; **ningún hueco entre palabras > 0.3 s** (máx. 0.58 s una vez) → limpieza de silencios agresiva [REF].
- Pausas conservadas sólo antes del veredicto o tras una pregunta [REF].
- Pattern interrupts cada 2–5 s (sticker, tarjeta, aspa, zoom) [REF].

## Reglas extraídas → implementación

| Regla | Dónde vive |
|---|---|
| Subtítulo 1 palabra, amarillo glow, sobre la cabeza | `src/subtitles/WordCaption.tsx`, `CAPTION` en `src/brand/tokens.ts` |
| Jump cut con reencuadre cada 1.2–2.5 s | `scripts/lib/edit.mjs → buildEdl`, `src/framing/framing.ts` |
| Hueco máx. 0.3 s, pausa dramática 0.45 s | `RULES` en `scripts/lib/edit.mjs` |
| Punch-in en revelación y giro | `buildEdl` |
| Look «Combinación visual» | `color-presets/combinacion-visual.json`, `scripts/grade.mjs` |
| Stickers / tarjetas / etiquetas / aspa / revelación / sílabas / badges | `src/motion-graphics/*` |
| Estructura narrativa en 8 bloques | `guessRole` + `templates/native-codes.json` + canvas |
| CTA fijo | `BRAND.ctaScript` |
| Glosario de errores de transcripción reales | `templates/glossary.json` |
