/**
 * VOCARE IURIS — tokens de identidad audiovisual.
 *
 * Todos los valores marcados como [REF] fueron medidos en los 5 videos de referencia
 * (ver references/REFERENCE_ANALYSIS.md). Los marcados como [APROX] son la mejor
 * aproximación disponible (p. ej. la tipografía exacta de CapCut no está embebida en
 * el video). Los marcados como [REC] son recomendaciones del estudio, no observadas.
 */

export const FORMAT = {
  width: 1080, // [REF] todas las referencias 1080x1920
  height: 1920,
  fps: 30, // [REF] 30 fps
} as const;

export const COLORS = {
  // [REF] amarillo del subtítulo palabra-a-palabra (muestreado: ~#FFE81A con glow amarillo)
  captionYellow: '#FFE61B',
  captionGlow: 'rgba(255, 221, 0, 0.85)',
  captionShadow: 'rgba(60, 40, 0, 0.55)',
  // [REF] texto de tarjetas de ley / etiquetas: blanco cálido (crema)
  cardText: '#FFFDF0',
  white: '#FFFFFF',
  // [REF] caja de selección "estilo editor" azul con tiradores
  selectionFill: 'rgba(108, 140, 230, 0.78)',
  selectionStroke: '#4C7BF2',
  selectionHandle: '#3E6FF0',
  // [REF] acento rojo de negación (✖)
  deny: '#E5252A',
  // [REC] colores de apoyo para gráficos explicativos
  ink: '#121212',
  ok: '#22C55E',
} as const;

export const FONTS = {
  // [APROX] Subtítulo: sans geométrica ExtraBold Itálica, minúsculas. Montserrat 800 Italic
  // es el equivalente libre más cercano observado (a de doble piso, terminales redondeados).
  caption: "'VI Caption', 'Montserrat', sans-serif",
  // [APROX] Tarjetas "Ley 30057", etiquetas: grotesca bold, tracking cerrado.
  card: "'VI Card', 'Inter', 'Helvetica Neue', Arial, sans-serif",
  // [APROX] Título de revelación ("Eso es ilegal"): serif display de alto contraste, muy
  // condensada. Playfair Display 900 comprimida horizontalmente (scaleX 0.7) como equivalente libre.
  reveal: "'VI Reveal', 'Playfair Display', Georgia, serif",
} as const;

export const CAPTION = {
  // [REF] una sola palabra por vez, sincronizada con la voz
  wordsPerPage: 1,
  // [REF] tamaño ≈ 58–64 px de cuerpo sobre 1080 px de ancho
  fontSize: 62,
  fontWeight: 800,
  // [REF] posición: espacio negativo sobre la cabeza, entre 19% y 28% de la altura
  defaultY: 0.215,
  // [REF] siempre minúsculas salvo siglas/números (SBS, 30057)
  lowercase: true,
  // [REF] sin animación de entrada perceptible: corte seco palabra-a-palabra
  // [REC] micro-pop de 2 frames opcional para palabras clave
  keywordPop: true,
} as const;

export const RHYTHM = {
  // [REF] 3.2–3.6 palabras/segundo tras la limpieza
  targetWordsPerSecond: [3.2, 3.7] as [number, number],
  // [REF] ningún hueco entre palabras > 0.3 s (máx. observado 0.58 s, 1 vez)
  maxGapSeconds: 0.3,
  // [REF] pausa dramática permitida (antes de un veredicto)
  dramaticPauseSeconds: 0.45,
  // [REF] la primera palabra suena en el frame 0
  firstWordAt: 0,
  // [REF] duración total 35–52 s
  targetDuration: [30, 55] as [number, number],
  // [REF] un cambio de escala o corte cada 1.2–2.5 s (media ≈ 1.6 s)
  reframeEverySeconds: [1.2, 2.5] as [number, number],
} as const;

export const FRAMING = {
  // [REF] plano base: plano medio-largo (rodillas a cabeza) con aire superior para el subtítulo
  base: { scale: 1.0, x: 0, y: 0 },
  // [REF] alternancia sutil entre ~0.93x y ~1.06x en jump cuts
  subtleIn: { scale: 1.08, y: -0.02 },
  subtleOut: { scale: 1.0, y: 0 },
  // [REF] punch-in en veredicto ("pero eso es ilegal") ≈ 1.10–1.17x
  punchIn: { scale: 1.16, y: -0.04 },
  // [REF] crash zoom en hook / momento sorpresa ≈ 1.3–1.45x, centrado en el rostro
  crash: { scale: 1.42, y: -0.1 },
} as const;

export const AUDIO = {
  // [REF] referencias entre -25.5 y -17.5 LUFS (inconsistente) → [REC] normalizar a -14 LUFS
  targetLufs: -14,
  truePeak: -1.0,
  // [REF] no se confirma cama musical constante; [REC] música opcional a -30 dB bajo voz
  musicDb: -30,
  sfxDb: -14,
} as const;

export const SAFE_ZONE = {
  // [REC] zonas seguras TikTok/Reels (UI de la plataforma)
  top: 0.08,
  bottom: 0.2,
  right: 0.12,
} as const;

export const BRAND = {
  name: 'Vocare Iuris',
  handle: '@vocareiuris',
  // [REF] CTA verbal fijo observado en las 5 piezas
  ctaScript: 'Sigue a Vocare Iuris y guarda este video. No sabes cuándo podrás necesitarlo.',
} as const;
