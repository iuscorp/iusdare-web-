import { z } from "zod";

/**
 * EDIT DECISION LIST (EDL)
 *
 * One JSON file per video: projects/<slug>/edit.json.
 * It is the single source of truth shared by the Remotion template, the
 * preview canvas generator, the renderer and QC.
 *
 * Timing rule: overlays, captions and b-roll are anchored to SOURCE time
 * (seconds in the raw footage, the same clock as the transcript) by default.
 * When segments are re-ordered or trimmed, everything follows automatically.
 * Use clock: "output" only for elements that belong to the final timeline
 * (e.g. the end card).
 */

export const narrativeRole = z.enum([
  "hook",
  "context",
  "tension",
  "development",
  "reveal",
  "resolution",
  "cta",
]);

export const nativeCode = z.enum([
  "hook",
  "antihook",
  "reveal",
  "build-up",
  "pattern-interrupt",
  "match-cut",
  "reframe",
  "scale-change",
  "punch-in",
  "strategic-text",
  "visual-stimulus",
  "audio-stimulus",
  "rhythm-change",
  "retention-loop",
  "open-loop",
  "payoff",
]);

export const framingPreset = z.enum(["wide", "medium", "close", "extreme", "custom"]);

export const easingName = z.enum(["linear", "easeIn", "easeOut", "easeInOut"]);

export const framing = z.object({
  preset: framingPreset.default("medium"),
  /** Scale when preset is "custom" (1 = original framing). */
  scale: z.number().min(1).max(2).optional(),
  /** Focus point in the source frame, 0..1 (eyes / face center). */
  focusX: z.number().min(0).max(1).default(0.5),
  focusY: z.number().min(0).max(1).default(0.36),
  /** Animated push within the segment (e.g. 1 → 1.06). Multiplies preset scale. */
  zoomFrom: z.number().default(1),
  zoomTo: z.number().default(1),
  easing: easingName.default("easeInOut"),
});

export const segment = z.object({
  id: z.string(),
  source: z.string().default("main"),
  /** Seconds in source footage. */
  in: z.number(),
  out: z.number(),
  role: narrativeRole,
  /** What problem this block addresses / what it does for the viewer. */
  purpose: z.string().default(""),
  framing: framing.default({}),
  nativeCodes: z.array(nativeCode).default([]),
  /** Why the native code is used here (comprehension / retention problem solved). */
  rationale: z.string().default(""),
  /** Cut INTO this segment. "cut" = direct cut (default and preferred). */
  transitionIn: z.enum(["cut", "flash", "light-leak", "dip"]).default("cut"),
  gainDb: z.number().default(0),
});

const timed = {
  start: z.number(),
  end: z.number(),
  clock: z.enum(["source", "output"]).default("source"),
  source: z.string().default("main"),
};

export const graphicComponent = z.enum([
  "StrategicText",
  "DataCard",
  "KeyPoints",
  "LegalReference",
  "LowerThird",
  "QuoteCard",
  "AccentLine",
  "CTAEndCard",
]);

export const graphic = z.object({
  id: z.string(),
  component: graphicComponent,
  ...timed,
  props: z.record(z.any()).default({}),
  function: z.enum(["comprension", "enfasis", "retencion"]),
  rationale: z.string().default(""),
});

export const broll = z.object({
  id: z.string(),
  ...timed,
  /** Path under public/ (e.g. "b-roll/library/fingerprint-01.mp4"). null = still to be sourced. */
  src: z.string().nullable().default(null),
  kind: z.enum(["video", "image"]).default("video"),
  /** Layout: full screen replace, upper split, or framed card over presenter. */
  layout: z.enum(["full", "split-top", "card"]).default("full"),
  /** Seconds into the b-roll file to start. */
  trimStart: z.number().default(0),
  playbackRate: z.number().default(1),
  /** The phrase it accompanies. */
  phrase: z.string(),
  concept: z.string(),
  function: z.string(),
  description: z.string(),
  searchQuery: z.string().default(""),
  provider: z.string().default("pendiente"),
  license: z.string().default(""),
  /** Image-only: slow push to avoid a frozen frame. */
  kenBurns: z.boolean().default(true),
  /** Keep the presenter's voice; b-roll audio is muted unless set. */
  volume: z.number().default(0),
  grade: z.enum(["none", "cool", "warm", "mono"]).default("none"),
});

export const word = z.object({
  w: z.string(),
  s: z.number(),
  e: z.number(),
});

export const captions = z.object({
  enabled: z.boolean().default(true),
  source: z.string().default("main"),
  wordsPerGroup: z.number().default(3),
  /** Words that receive the gold emphasis (lower-case match). */
  emphasis: z.array(z.string()).default([]),
  /** Word-level transcript in source time (from scripts/transcribe.py). */
  words: z.array(word).default([]),
  /** Optional corrections: exact replacements applied to words (e.g. "reboreado" → "Revoredo"). */
  replace: z.record(z.string()).default({}),
});

export const sfx = z.object({
  src: z.string(),
  at: z.number(),
  clock: z.enum(["source", "output"]).default("source"),
  source: z.string().default("main"),
  volume: z.number().default(0.35),
  why: z.string().default(""),
});

export const audio = z.object({
  voiceGainDb: z.number().default(0),
  music: z
    .object({
      src: z.string(),
      volume: z.number().default(0.12),
      /** Volume while b-roll is on screen and voice continues (keep low). */
      duckedVolume: z.number().default(0.08),
      fadeInSec: z.number().default(0.6),
      fadeOutSec: z.number().default(1.2),
      trimStart: z.number().default(0),
    })
    .nullable()
    .default(null),
  sfx: z.array(sfx).default([]),
});

export const editSchema = z.object({
  meta: z.object({
    slug: z.string(),
    title: z.string(),
    format: z.enum(["vertical", "square", "horizontal"]).default("vertical"),
    fps: z.number().default(30),
    status: z
      .enum(["analisis", "canvas", "aprobado", "edicion", "revision", "final"])
      .default("analisis"),
  }),
  /** Source id → path under public/. */
  sources: z.record(z.string()),
  /** Retention loop summary (filled in Step 2). */
  story: z
    .object({
      problem: z.string().default(""),
      whyItMatters: z.string().default(""),
      riskOrOpportunity: z.string().default(""),
      openQuestion: z.string().default(""),
      payoff: z.string().default(""),
      cta: z.string().default(""),
    })
    .default({}),
  segments: z.array(segment).min(1),
  graphics: z.array(graphic).default([]),
  broll: z.array(broll).default([]),
  captions: captions.default({}),
  audio: audio.default({}),
  endCard: z
    .object({
      enabled: z.boolean().default(true),
      durationSec: z.number().default(2.2),
      line: z.string().default("Tenemos una conversación pendiente"),
      action: z.string().default("Escríbenos"),
    })
    .default({}),
  showLogo: z.boolean().default(true),
  /**
   * Presenter face box in the raw, as fractions of frame height (measured in
   * PASO 1 from the analysis frames). Drives face-safe "auto" graphic placement.
   */
  layout: z
    .object({
      faceTop: z.number().min(0).max(1).default(0.27),
      faceBottom: z.number().min(0).max(1).default(0.46),
      /**
       * Brightness of the set behind the presenter's head (where text-only
       * graphics land). "light" (white wall) switches StrategicText /
       * LowerThird to ink text with deep-gold emphasis. Over b-roll the
       * light-on-dark style is always used.
       */
      backdrop: z.enum(["dark", "light"]).default("dark"),
    })
    .default({}),
});

export type Edit = z.infer<typeof editSchema>;
export type EditInput = z.input<typeof editSchema>;
export type Segment = z.infer<typeof segment>;
export type Graphic = z.infer<typeof graphic>;
export type BRoll = z.infer<typeof broll>;
export type Word = z.infer<typeof word>;
export type Framing = z.infer<typeof framing>;

export const formats = {
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1350 },
  horizontal: { width: 1920, height: 1080 },
} as const;
