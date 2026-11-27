/**
 * REVOREDO ABOGADOS — Brand tokens for video.
 *
 * Source of truth for every color, type size, spacing and motion value used by
 * the studio. Components never hard-code brand values: they read them here.
 *
 * Origin of each value is documented in documentation/02-identidad-de-marca.md:
 *  - gold: official accent of revoredo.pe (#FAA726: heading rules, stat frame).
 *  - Lato: official typeface of revoredo.pe (labels, data, UI).
 *  - ink / paper / mist / steel: sampled from the reference set (office, wardrobe).
 *  - Serif italic captions: matched to the reference reel caption style.
 */

export const colors = {
  /** Brand gold — revoredo.pe accent (#FAA726). Accent only, never large fills. */
  gold: "#FAA726",
  goldSoft: "#FDC468",
  goldDeep: "#C9801A",
  /** Near-black used for cards, end frames and type on light. */
  ink: "#111214",
  inkSoft: "#1C1D20",
  graphite: "#2A2C30",
  /** Light neutrals. */
  white: "#FFFFFF",
  paper: "#F5F3EF",
  /** Cool neutrals from the office set (walls / glass). */
  mist: "#C9D3D6",
  steel: "#6E8590",
  /** Functional. Use sparingly: only for a real risk / correct state. */
  risk: "#C8553D",
  ok: "#6E9F7B",
} as const;

export type BrandColor = keyof typeof colors;

export const fonts = {
  /** Display + captions: elegant serif, italic for spoken captions. */
  serif: "Instrument Serif",
  /** Labels, data, UI chrome — Lato, as on revoredo.pe. */
  sans: "Lato",
} as const;

/**
 * Type scale expressed for a 1080px-wide canvas. Use `scaleFor(width)` to
 * adapt to other formats.
 */
export const type = {
  caption: 66,
  captionSmall: 54,
  headline: 104,
  title: 84,
  subtitle: 48,
  body: 40,
  label: 30,
  micro: 24,
  dataNumber: 160,
} as const;

export const space = {
  /** Safe area for 1080 x 1920 vertical (platform UI overlap considered). */
  safeX: 90,
  safeTop: 230,
  safeBottom: 380,
  gap: 24,
  radius: 18,
  line: 3,
} as const;

/** Motion language: short, confident, no bounce. */
export const motion = {
  /** Default entrance duration (frames @30fps). */
  enter: 14,
  exit: 10,
  /** Spring used for all UI entrances — critically damped, no overshoot. */
  spring: { damping: 200, stiffness: 120, mass: 1 },
  /** Max zoom applied to the presenter. Above this the 720p→1080p gets soft. */
  maxPunchIn: 1.32,
  /** Gentle continuous push applied in "breathing" holds. */
  driftPerSecond: 0.008,
} as const;

/** Caption placement measured from the reference: ~64% of frame height. */
export const captionLayout = {
  centerY: 0.64,
  maxWidth: 0.78,
  wordsPerGroup: 3,
} as const;

export const scaleFor = (width: number) => width / 1080;

export const brand = {
  name: "Revoredo Abogados",
  handle: "@revoredope",
  signatureCta: "Tenemos una conversación pendiente",
  /**
   * Official logo file. Drop the vector/PNG export from the brand kit at
   * public/brand/logo/revoredo-mark.png and set this to its path. While null,
   * <LogoMark/> draws the power-bug faithfully as SVG.
   */
  logoSrc: null as string | null,
} as const;
