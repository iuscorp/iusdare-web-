import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, scaleFor } from "../brand/tokens";
import { clamp, easings, useEnvelope } from "../lib/anim";

export type AccentLineProps = {
  /** Vertical position 0..1 of the frame. */
  y?: number;
  /** Line length as fraction of width. */
  length?: number;
  color?: "gold" | "white";
};

/**
 * Minimal moving rule. A quiet visual stimulus for a beat change
 * (paso de contexto → tensión) without adding text. Function: retención.
 */
export const AccentLine: React.FC<AccentLineProps> = ({ y = 0.56, length = 0.32, color = "gold" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope(8, 8);
  const p = interpolate(frame, [0, 16], [0, 1], { ...clamp, easing: easings.easeOut });
  const w = width * length;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: height * y,
          left: (width - w) / 2,
          width: w * p,
          height: 3 * k,
          background: color === "gold" ? colors.gold : colors.white,
          opacity: env,
          borderRadius: 2 * k,
        }}
      />
    </AbsoluteFill>
  );
};
