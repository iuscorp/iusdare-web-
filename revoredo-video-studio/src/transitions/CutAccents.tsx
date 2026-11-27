import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { lightLeak } from "@remotion/effects/light-leak";
import { Solid } from "remotion";
import { clamp } from "../lib/anim";
import { colors } from "../brand/tokens";

/**
 * Cut accents. The studio's default is the DIRECT CUT. These accents play ON
 * TOP of a cut (they never cross-dissolve footage) and must be used only to
 * mark a change of narrative block — as in the reference, where a warm flash
 * marks the jump from presenter to the case b-roll.
 */

/** 6-frame warm flash centered on the cut. */
export const FlashAccent: React.FC<{ tint?: "warm" | "white" }> = ({ tint = "warm" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mid = durationInFrames / 2;
  const o = interpolate(frame, [0, mid, durationInFrames], [0, 0.85, 0], clamp);
  const bg =
    tint === "warm"
      ? `radial-gradient(circle at 50% 40%, rgba(255,246,225,1) 0%, ${colors.goldSoft} 45%, rgba(233,169,59,0.0) 100%)`
      : "white";
  return <AbsoluteFill style={{ background: bg, opacity: o, mixBlendMode: "screen" }} />;
};

/** Organic light leak (Remotion effects) — for section changes only. */
export const LightLeakAccent: React.FC<{ seed?: number }> = ({ seed = 3 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen" }}>
      <Solid
        width={width}
        height={height}
        color="black"
        effects={[
          lightLeak({
            seed,
            hueShift: 20,
            progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp),
          }),
        ]}
      />
    </AbsoluteFill>
  );
};

/** Short dip to ink, for the move into the end card. */
export const DipAccent: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, durationInFrames / 2, durationInFrames], [0, 1, 0], clamp);
  return <AbsoluteFill style={{ background: colors.ink, opacity: o }} />;
};
