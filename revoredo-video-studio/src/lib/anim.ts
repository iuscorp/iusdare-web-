import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { motion } from "../brand/tokens";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const easings = {
  linear: Easing.linear,
  easeIn: Easing.bezier(0.55, 0, 1, 0.45),
  easeOut: Easing.bezier(0.16, 1, 0.3, 1),
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

/**
 * Standard in/out envelope for overlays inside a <Sequence>.
 * Returns 0→1 on enter, 1 while holding, 1→0 on exit. No overshoot.
 */
export const useEnvelope = (enter: number = motion.enter, exit: number = motion.exit) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = spring({ frame, fps, config: motion.spring, durationInFrames: enter });
  const outP = interpolate(frame, [durationInFrames - exit, durationInFrames], [1, 0], {
    ...clamp,
    easing: easings.easeIn,
  });
  return Math.min(inP, outP);
};

/** Staggered child entrance: progress for item i. */
export const useStagger = (i: number, step = 5, enter: number = motion.enter) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - i * step, fps, config: motion.spring, durationInFrames: enter });
};
