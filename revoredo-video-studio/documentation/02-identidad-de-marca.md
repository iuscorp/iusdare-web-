# 02 · Identidad de marca en video

Archivo fuente de todos los valores: `src/brand/tokens.ts`. **Ningún componente define colores ni tamaños propios.**

## Recursos de marca identificados

| Recurso | Dónde está | Estado en el estudio |
|---|---|---|
| Bug “power” dorado (logo de uso en video) | Esquina superior derecha de los reels de referencia | Reproducido fielmente en SVG (`LogoMark.tsx`). Recorte de referencia en `public/brand/logo/` |
| Kits de marca de Canva | Kits “REVOREDO.PE”, “REVOREDO & CO” y “REVOREDO IUSCORP” | Detectados. Las miniaturas no se pudieron descargar desde esta sesión porque la red bloquea `media.canva.com` |
| Logos en Drive | `LOGO-NITIDO*.png/jpg`, `LOGO.ai` (carpetas REVOREDO&CO) | Identificados. Falta confirmar cuál es el oficial de Revoredo Abogados |
| Guiones oficiales | Drive, `REVOREDO.PE (Abogados Digitales)/GUIONES` | Usados como glosario y como verificación de cifras |
| Voz de marca | Guiones y reels | Firma de cierre: “Tenemos una conversación pendiente” · handle **@revoredope** |
| Marca hermana web (IUS DARE · Revoredo Iuscorp) | `index.html` de este repo | Solo como contexto: navy y dorado. **No se usa** en los videos de Revoredo Abogados |

### Para completar con el logo oficial

1. Exportar el logo oficial (PNG transparente, mínimo 512 px) a `public/brand/logo/revoredo-mark.png`.
2. En `src/brand/tokens.ts`, poner `logoSrc: "brand/logo/revoredo-mark.png"`.
3. Ejecutar `npm run studio:showcase` y revisar el resultado.

## Paleta

| Token | HEX | Uso |
|---|---|---|
| `gold` | `#E9A93B` | Acento de marca: bug, reglas, énfasis de una palabra, kickers. **Nunca como fondo grande** |
| `goldSoft` | `#F3C969` | Palabra enfatizada en subtítulos |
| `goldDeep` | `#B9832A` | Acento sobre fondos claros |
| `ink` | `#111214` | Fondos de tarjeta y end card |
| `white` | `#FFFFFF` | Subtítulos y titulares sobre imagen |
| `paper` | `#F5F3EF` | Textos secundarios claros |
| `mist` / `steel` | `#C9D3D6` / `#6E8590` | Neutros fríos del set (oficina) y notas de fuente |
| `risk` | `#C8553D` | Solo para “lo que faltó” o un incumplimiento (KeyPoints `cross`) |

El color dorado sale del bug de la referencia. Los neutros fríos salen del set: pared clara con acento turquesa y vidrio.

## Tipografía

| Rol | Fuente | Por qué |
|---|---|---|
| Subtítulos, titulares y datos | **Instrument Serif** (regular e itálica) | Reproduce la serif itálica de los subtítulos de la referencia. Transmite elegancia y autoridad |
| Etiquetas, notas y fuentes | **Inter** (400–700) | Sans neutra y legible en tamaños chicos |

Las fuentes están incluidas en `public/brand/fonts/` (woff2), así que el render no depende de la red.

> Si la marca tiene tipografías corporativas propias, se reemplazan los archivos y `fonts` en `tokens.ts`. También se pueden elegir a ojo en FontHound.

### Escala (lienzo de 1080 px de ancho)

| Uso | Tamaño |
|---|---|
| Subtítulo | 66 |
| Titular | 104 |
| Título | 84 |
| Dato | 160 |
| Subtítulo de tarjeta | 48 |
| Cuerpo | 40 |
| Etiqueta | 30 |
| Micro | 24 |

## Reglas de composición

- **Una sola idea por pantalla.** Si conviven un subtítulo y un gráfico, el gráfico tiene que aportar un dato que el subtítulo no da.
- **Rostro intocable.** Los gráficos se colocan en la franja libre que calcula el estudio (`src/lib/layout.ts`), nunca sobre la cara.
- **Márgenes de seguridad (9:16):** 90 px a los lados, 7,5 % arriba y la banda de subtítulos al 64 %.
- **Dorado como acento:** una palabra o una regla por pantalla, nunca como relleno.
- **Movimiento:** entradas con spring críticamente amortiguado (sin rebote), de 14 fotogramas. Salidas de 10 fotogramas.
- **Prohibido:** stickers, emojis animados, transiciones de catálogo, glitch, shake, textos con contorno grueso y degradados de colores ajenos a la marca.
