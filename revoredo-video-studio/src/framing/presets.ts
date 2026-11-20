import type { Framing } from "../schema/edit";
import { motion } from "../brand/tokens";

/**
 * Framing presets — digital reframes of a single-camera take.
 *
 *  wide    1.00  original framing (establishing, breathing room)
 *  medium  1.12  default talking framing (chest-up feel on a vertical take)
 *  close   1.24  emphasis: key idea, data, consequence
 *  extreme 1.32  rare: the single strongest sentence (hook or payoff)
 *
 * The cap (motion.maxPunchIn) protects image quality: a 720p source scaled
 * to 1080 wide is already 1.5x; beyond ~1.32 extra the face gets soft.
 * Alternate presets between consecutive segments so every direct cut also
 * changes scale (scale-change code) and never produces a jump-cut.
 */
export const presetScale: Record<Exclude<Framing["preset"], "custom">, number> = {
  wide: 1,
  medium: 1.12,
  close: 1.24,
  extreme: 1.32,
};

export const scaleOf = (f: Framing) =>
  Math.min(f.preset === "custom" ? (f.scale ?? 1) : presetScale[f.preset], motion.maxPunchIn);
