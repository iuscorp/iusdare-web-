import React, { useContext } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { colors, scaleFor, space } from "../brand/tokens";
import { ZoneContext } from "../lib/layout";

export type Position = "auto" | "upper" | "center" | "lower";

/**
 * Vertical anchors for a 9:16 talking head (face ≈ 13–32 % of the height,
 * captions ≈ 64 %):
 *  upper  12 %  one-line text above the head, or any graphic over b-roll
 *  center 36 %  chest band — DEFAULT for cards over the presenter (never the face)
 *  lower  74 %  below captions (lower thirds)
 *  auto   DEFAULT — centered in the face-free band computed by the template
 *         from the presenter's face box and the segment's reframe
 *         (src/lib/layout.ts). Falls back to "upper" outside a reel.
 */
export const positionTop = (p: Exclude<Position, "auto">, height: number) =>
  p === "upper" ? height * 0.12 : p === "center" ? height * 0.36 : height * 0.74;

export const Stage: React.FC<{ position?: Position; children: React.ReactNode; align?: "left" | "center" }> = ({
  position = "auto",
  children,
  align = "center",
}) => {
  const { width, height } = useVideoConfig();
  const zone = useContext(ZoneContext);
  const k = scaleFor(width);
  const box: React.CSSProperties =
    position === "auto" && zone
      ? { top: zone.top * height, height: (zone.bottom - zone.top) * height, justifyContent: "center" }
      : { top: positionTop(position === "auto" ? "upper" : position, height) };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: space.safeX * k,
          right: space.safeX * k,
          display: "flex",
          flexDirection: "column",
          alignItems: align === "center" ? "center" : "flex-start",
          textAlign: align,
          ...box,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Dark glass card. Used only when legibility over footage requires it. */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; k: number }> = ({
  children,
  style,
  k,
}) => (
  <div
    style={{
      background: "rgba(17,18,20,0.72)",
      backdropFilter: `blur(${18 * k}px)`,
      border: `${1.5 * k}px solid rgba(255,255,255,0.10)`,
      borderRadius: space.radius * k,
      padding: `${34 * k}px ${40 * k}px`,
      boxShadow: `0 ${20 * k}px ${60 * k}px rgba(0,0,0,0.35)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Thin gold rule that draws from left (progress 0..1). */
export const GoldRule: React.FC<{ progress: number; width: number; k: number; align?: "left" | "center" }> = ({
  progress,
  width,
  k,
  align = "center",
}) => (
  <div
    style={{
      width,
      height: space.line * k,
      display: "flex",
      justifyContent: align === "center" ? "center" : "flex-start",
    }}
  >
    <div style={{ width: width * progress, height: "100%", background: colors.gold, borderRadius: 2 * k }} />
  </div>
);

/** Splits `text` and colors the `emphasis` substring in gold. */
export const withEmphasis = (text: string, emphasis?: string) => {
  if (!emphasis || !text.includes(emphasis)) return <>{text}</>;
  const [a, ...rest] = text.split(emphasis);
  return (
    <>
      {a}
      <span style={{ color: colors.goldSoft }}>{emphasis}</span>
      {rest.join(emphasis)}
    </>
  );
};
