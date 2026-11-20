import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../brand/tokens";
import { clamp, easings } from "../lib/anim";
import type { Tone } from "./primitives";

/**
 * Tech line elements (revoredo.pe "Abogados Digitales"): thin gold strokes,
 * HUD corner brackets, diamond nodes. No filled boxes.
 */

/** Four L-shaped corner brackets that draw in around a block. */
export const CornerBrackets: React.FC<{ progress: number; k: number; size?: number; color?: string; inset?: number }> = ({
  progress,
  k,
  size = 26,
  color = colors.gold,
  inset = -18,
}) => {
  const len = size * k * progress;
  const w = 2.5 * k;
  const corner = (pos: React.CSSProperties, h: "left" | "right", v: "top" | "bottom") => (
    <div style={{ position: "absolute", ...pos, width: size * k, height: size * k }}>
      <div style={{ position: "absolute", [v]: 0, [h]: 0, width: len, height: w, background: color }} />
      <div style={{ position: "absolute", [v]: 0, [h]: 0, width: w, height: len, background: color }} />
    </div>
  );
  const o = inset * k;
  return (
    <>
      {corner({ top: o, left: o }, "left", "top")}
      {corner({ top: o, right: o }, "right", "top")}
      {corner({ bottom: o, left: o }, "left", "bottom")}
      {corner({ bottom: o, right: o }, "right", "bottom")}
    </>
  );
};

/** Rotated-square node with a ring that expands once on reveal. */
export const DiamondNode: React.FC<{ progress: number; k: number; color?: string }> = ({ progress, k, color = colors.gold }) => {
  const ring = interpolate(progress, [0.3, 1], [0.6, 2.1], clamp);
  const ringO = interpolate(progress, [0.3, 0.7, 1], [0, 0.7, 0], clamp);
  return (
    <div style={{ position: "relative", width: 18 * k, height: 18 * k, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `${2 * k}px solid ${color}`,
          borderRadius: 3 * k,
          transform: `rotate(45deg) scale(${ring})`,
          opacity: ringO,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 3 * k,
          background: color,
          borderRadius: 2 * k,
          transform: `rotate(45deg) scale(${progress})`,
        }}
      />
    </div>
  );
};

/** Reveal progress for an element that appears at `atFrame` (critically damped, ~10 frames). */
export const useRevealAt = (atFrame: number, dur = 10) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [atFrame, atFrame + dur], [0, 1], { ...clamp, easing: easings.easeOut });
};

export const useFps = () => useVideoConfig().fps;

export const toneColors = (tone: Tone) =>
  tone === "ink"
    ? { text: colors.ink, sub: "rgba(17,18,20,0.62)", line: "rgba(17,18,20,0.25)", shadow: "0 1px 10px rgba(255,255,255,0.6)", accent: colors.goldDeep }
    : { text: colors.white, sub: "rgba(255,255,255,0.75)", line: "rgba(255,255,255,0.3)", shadow: "0 2px 14px rgba(0,0,0,0.55)", accent: colors.gold };
