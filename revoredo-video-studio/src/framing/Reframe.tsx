import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Framing } from "../schema/edit";
import { clamp, easings } from "../lib/anim";
import { motion } from "../brand/tokens";
import { scaleOf } from "./presets";

/**
 * Applies a framing preset + animated punch-in to any child (video or image)
 * that fills the frame with object-fit: cover.
 *
 * The transform origin is the focus point (eyes), and translation is clamped
 * so the scaled image never reveals an edge.
 */
export const Reframe: React.FC<{ framing: Framing; children: React.ReactNode }> = ({ framing, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const base = scaleOf(framing);
  const z = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [framing.zoomFrom, framing.zoomTo], {
    ...clamp,
    easing: easings[framing.easing],
  });
  const s = Math.min(base * z, motion.maxPunchIn * 1.06);
  // Keep the focus point where it is in the source, but never expose edges.
  const maxTx = ((s - 1) * width) / 2;
  const maxTy = ((s - 1) * height) / 2;
  const tx = Math.max(-maxTx, Math.min(maxTx, (0.5 - framing.focusX) * width * (s - 1)));
  const ty = Math.max(-maxTy, Math.min(maxTy, (0.5 - framing.focusY) * height * (s - 1)));
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
