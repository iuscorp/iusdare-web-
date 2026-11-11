# Metodología Guille Collado · Códigos Nativos aplicados a Vocare Iuris

## 1. Qué está respaldado por fuentes (y qué no)

Fuentes consultadas (públicas): página del programa **«Hackeando el Algoritmo»**
(guillermocollado.com/hackeando-el-algoritmo), página «Grupo Beta», comunidad
**«Hackeando la Edición»** (skool.com/hackeando-la-edicion) y oferta «La Fórmula del Éxito» (Kajabi).
El contenido de los cursos es de pago: **los nombres concretos de los «8 códigos nativos» no son
públicos** y este estudio no los inventa.

| Concepto | Lo que dice la fuente (literal o casi literal) | Estado |
|---|---|---|
| Estructura del video | Temario: «Elementos del **reveal** · **antihook** explicado · **Build Up** explicado · **Value** explicado · **CTA** explicado» | ✅ GC |
| Método GAL | «**gancho, aporte de valor, llamada a la acción**» | ✅ GC |
| Primeros 3 segundos | «captar la atención en los **primeros 3 segundos** de tu video» | ✅ GC |
| 8 códigos nativos | «Los **8 códigos nativos** para dominar el lenguaje de la plataforma», divididos en **tradicionales** y **modernos** | ✅ existe / ❌ nombres no públicos |
| Ruptura de patrón | «La nueva realidad de la **ruptura de patrón**» | ✅ GC |
| Video perfecto | «Estructura · Timing · Sonido · Narrativa · **Estímulos** · Mensaje · Efectos · **Natividad** · Zona segura» | ✅ GC |
| Edición | «**Subtítulos que enganchan** · Mejores tipografías dependiendo de la personalidad · El poder del **B Roll** · GIFs · Paletas de colores e identidad visual» | ✅ GC |
| Edición retención | «entendiendo **ritmo, estructura y narrativa** para retener»; «Edición creativa con códigos nativos» | ✅ GC |
| Neuromarketing | «**Asociación condicionada**»; «El poder de la narrativa y la Música» | ✅ GC |
| Match cut, crash zoom, microinterrupciones | No aparecen en el material público de Guille Collado | ❌ → se tratan como recursos de edición generales [REC] |

## 2. Cómo se traduce al sistema (cada recurso con función narrativa)

| Código | Origen | Función jurídica-narrativa | Implementación |
|---|---|---|---|
| **Reveal / Antihook** | GC + REF | Situación en 2.ª persona + veredicto en < 3 s («…eso es ilegal») | voz en frame 0, `settle`, `revealTitle` |
| **Build Up** | GC + REF | Respaldo legal (ley, artículo, institución) que construye credibilidad | `lawCard` (tecleo) + SFX `type`, `documentCover`, `logoBadge` |
| **Value** | GC + REF | Traducir el tecnicismo y decir qué hacer | `selectionLabel`, `stepList`, `emojiEquation` |
| **CTA** | GC + REF | «Sigue a Vocare Iuris y guarda este video» → guardados | plano `base`, nada encima |
| **Ruptura de patrón** | GC + REF | Recuperar atención y marcar una idea | `punchIn`, `crash`, `sticker`, `denyMark`, `kineticWord` |
| **Subtítulos que enganchan** | GC + REF | Comprensión sin sonido | `WordCaption` |
| **Estímulos visuales / B-roll** | GC + REF | Representar la situación cotidiana con FOTOS reales (no sólo emojis): el local, el trabajo, la cárcel… | `photoCard` (foto con marco, zoom lento y etiqueta), `sticker`, `backgroundPlate` |
| **Prueba visual de la norma** | GC (Build Up) + REC | El público VE el artículo: hoja impresa con el texto literal y resaltador amarillo sincronizado con la voz | `lawPage` (`highlightAt` por frase) |
| **Estímulos auditivos / sonido** | GC | Reforzar la aparición sin tapar la voz | `SfxLayer` (−14…−22 dB) |
| **Zona segura** | GC | Que la UI de TikTok/Reels no tape textos | `SAFE_ZONE`, `showSafeZones` |
| **Natividad** | GC + REF | Sentirse creado para la plataforma (micrófono en mano, interfaz de editor visible, sin intro) | reglas de encuadre + `selectionLabel` |
| **Asociación condicionada** | GC | Elementos de marca idénticos en todas las piezas (amarillo, CTA, cierre) → reconocimiento | tokens fijos de marca |
| **Loop abierto** | REF + REC | Formular la objeción del público y responderla después | pausa conservada tras pregunta + 🤨/🤔 |
| **Cierre en bucle** | REF | Repetir el veredicto al final | `punchIn` + énfasis |
| **Crash zoom / Match cut** | REC | Sorpresa (máx. 1) · transición entre ejemplo y norma | `move: crash`; match cut se propone en canvas sólo si hay tomas que lo permitan |

## 3. Reglas de uso (para no copiar tendencias mecánicamente)

1. **Ningún recurso sin función**: cada overlay del EDL debe poder justificarse en la columna
   «función» del canvas (sección D). Si no se puede, se elimina.
2. **La precisión jurídica manda**: los textos en pantalla (número de ley, artículo, institución)
   se escriben desde el brief, nunca desde la transcripción automática.
3. **Un estímulo cada ≤ 3 s (ideal ≤ 2.5 s), nunca dos grandes a la vez.** Alternar tipo (foto / norma / tarjeta / emoji / sello) y lado, y cambiar el encuadre en cada plano.
4. **Máximo 1** crash zoom, 1 título de revelación, 1 palabra cinética por video.
5. El tono es cercano y profesional: emojis como actores/emociones, no como decoración.

6. **Emojis primero; imágenes sólo** si no hay emoji que lo ejemplifique o si se habla de normativa (reglamento, ley, contrato). Variar los emojis entre videos. Objeto → imagen **sin fondo** (`cutout`, `scripts/cutout.py`, BiRefNet-lite MIT; fotos de UN objeto entero). Lugar/contexto → imagen **con fondo** (`photoCard`). **Nunca con borde.** Fotos: sólo con licencia libre (Openverse / Wikimedia Commons, CC BY / CC BY-SA / CC0),
   guardadas en `public/footage/<slug>/photos/` (no se suben al repo) y con su crédito en
   `projects/<slug>/photo-credits.json` → los créditos van en la descripción de la publicación.
7. **Normas impresas (`lawPage`)**: el texto es el literal de la norma (fuente oficial), nunca la
   transcripción. Si se recorta, usar «…».
