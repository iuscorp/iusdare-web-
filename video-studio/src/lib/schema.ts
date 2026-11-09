import {z} from 'zod';

/**
 * EDL (Edit Decision List) de Vocare Iuris.
 * Es el único "contrato" entre el análisis, el canvas y el render:
 *   scripts/draft-edl.mjs  → genera  projects/<slug>/edl.json
 *   scripts/canvas.mjs     → lo visualiza para aprobación
 *   scripts/render.mjs     → lo renderiza con la composición VocareEdit
 * Tiempos de `segments` = segundos del archivo fuente.
 * Tiempos de `captions`, `overlays`, `sfx` = segundos de la línea de tiempo FINAL.
 */

export const framingPresetSchema = z.enum(['base', 'subtleIn', 'subtleOut', 'punchIn', 'crash']);

export const framingSchema = z.union([
  framingPresetSchema,
  z.object({scale: z.number(), x: z.number().default(0), y: z.number().default(0)}),
]);

export const narrativeRoleSchema = z.enum([
  'hook',
  'reveal',
  'context',
  'legal-basis',
  'translation',
  'build-up',
  'twist',
  'steps',
  'recap',
  'cta',
]);

export const segmentSchema = z.object({
  id: z.string(),
  in: z.number(),
  out: z.number(),
  role: narrativeRoleSchema.optional(),
  framing: framingSchema.default('base'),
  /** animación de cámara dentro del segmento */
  move: z.enum(['none', 'crash', 'slowPush', 'settle']).default('none'),
  note: z.string().optional(),
});

export const captionSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  emphasis: z.boolean().default(false),
  /** posición vertical 0–1 (por defecto CAPTION.defaultY) */
  y: z.number().optional(),
});

const base = {
  start: z.number(),
  end: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
  /** se dibuja DETRÁS del presentador (requiere edl.personMatte, scripts/matte.mjs) */
  behindPerson: z.boolean().optional(),
};

export const overlaySchema = z.discriminatedUnion('type', [
  z.object({...base, type: z.literal('sticker'), emoji: z.string(), size: z.number().default(170)}),
  z.object({
    ...base,
    type: z.literal('lawCard'),
    title: z.string(),
    subtitle: z.string().optional(),
    footnote: z.string().optional(),
    color: z.enum(['white', 'yellow']).default('white'),
  }),
  z.object({...base, type: z.literal('selectionLabel'), text: z.string(), cursor: z.boolean().default(true)}),
  z.object({...base, type: z.literal('documentCover'), image: z.string(), label: z.string().optional()}),
  z.object({...base, type: z.literal('logoBadge'), image: z.string(), label: z.string().optional()}),
  z.object({...base, type: z.literal('photoCard'), image: z.string(), rotate: z.number().default(-4)}),
  z.object({...base, type: z.literal('backgroundPlate'), image: z.string()}),
  z.object({...base, type: z.literal('bigLetter'), text: z.string()}),
  z.object({
    ...base,
    type: z.literal('kineticWord'),
    syllables: z.array(z.string()),
    stepFrames: z.number().optional(),
    /** 'stack' = una sílaba por fila [REF]; 'rows' = palabra en 2 filas grandes (ideal detrás de la persona) */
    layout: z.enum(['stack', 'rows', 'line']).optional(),
    /** 'line': en MAYÚSCULAS */
    uppercase: z.boolean().optional(),
  }),
  z.object({...base, type: z.literal('revealTitle'), lines: z.array(z.string()), stepFrames: z.number().optional()}),
  z.object({...base, type: z.literal('textBadge'), text: z.string()}),
  z.object({...base, type: z.literal('denyMark')}),
  z.object({...base, type: z.literal('verdictStamp'), text: z.string(), tone: z.enum(['deny', 'ok']).default('deny')}),
  z.object({...base, type: z.literal('stepList'), title: z.string().optional(), steps: z.array(z.string())}),
  z.object({
    ...base,
    type: z.literal('comparison'),
    left: z.object({label: z.string(), emoji: z.string().optional()}),
    right: z.object({label: z.string(), emoji: z.string().optional()}),
  }),
  z.object({...base, type: z.literal('emojiEquation'), items: z.array(z.string())}),
]);

export const sfxSchema = z.object({
  name: z.enum(['pop', 'click', 'poi', 'kiran', 'fahhh', 'riser', 'stamp', 'whoosh', 'type', 'ding', 'boom', 'swish']),
  at: z.number(),
  volumeDb: z.number().default(-14),
});

export const edlSchema = z.object({
  slug: z.string(),
  title: z.string(),
  source: z.object({
    file: z.string(),
    graded: z.string().optional(),
    width: z.number(),
    height: z.number(),
    fps: z.number(),
    duration: z.number(),
  }),
  /** 'none' = sin tratamiento de color (por defecto). Otros valores = preset de color-presets/ */
  colorPreset: z.string().default('none'),
  /** si el footage ya pasó por scripts/grade.mjs, el look no se aplica en Remotion */
  colorAppliedInSource: z.boolean().default(false),
  segments: z.array(segmentSchema),
  captions: z.array(captionSchema),
  overlays: z.array(overlaySchema).default([]),
  sfx: z.array(sfxSchema).default([]),
  music: z.object({file: z.string(), volumeDb: z.number().default(-30)}).optional(),
  showSafeZones: z.boolean().default(false),
  /**
   * Trayectoria de la cabeza del presentador en tiempo FUENTE (scripts/track-head.py).
   * cx = centro horizontal, top = borde superior del pelo; normalizados 0–1.
   * Si existe, el subtítulo sigue la cabeza fotograma a fotograma.
   */
  /** recorte del presentador con alfa (WebM VP9), tiempo FUENTE, mismo tamaño que el footage */
  personMatte: z.string().optional(),
  headTrack: z
    .object({fps: z.number(), cx: z.array(z.number()), top: z.array(z.number())})
    .optional(),
});

export type Edl = z.infer<typeof edlSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Overlay = z.infer<typeof overlaySchema>;
export type Caption = z.infer<typeof captionSchema>;
export type Framing = z.infer<typeof framingSchema>;

export const outputDuration = (edl: Pick<Edl, 'segments'>) =>
  edl.segments.reduce((acc, s) => acc + Math.max(0, s.out - s.in), 0);

/**
 * Fotogramas de un plano. DEBE coincidir con el recorte del video (trimAfter − trimBefore):
 * ambos extremos se redondean por separado; si no, aparece un fotograma negro al final del plano.
 */
export const segmentFrames = (s: Pick<Segment, 'in' | 'out'>, fps: number) =>
  Math.max(1, Math.round(s.out * fps) - Math.round(s.in * fps));
