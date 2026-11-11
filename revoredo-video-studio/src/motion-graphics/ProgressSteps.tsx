import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, scaleFor } from "../brand/tokens";
import { clamp, easings, useEnvelope } from "../lib/anim";
import { Stage, useTone, type Position, type Tone } from "./primitives";
import { CornerBrackets, toneColors } from "./tech";

export type ProgressStepsProps = {
  /** Uppercase label (e.g. "Participación"). */
  label: string;
  /** Number of segments in the bar. */
  steps?: number;
  /** Optional labels under each segment (e.g. ["Año 1", …]). Only verified facts. */
  stepLabels?: string[];
  /** Show the 0→100 % counter. */
  percent?: boolean;
  /** Line under the bar (e.g. "Adquisición progresiva"). */
  caption?: string;
  /** Seconds (from start) the bar takes to fill. Default: 75 % of the graphic. */
  fillSec?: number;
  position?: Position;
  tone?: Tone | "auto";
};

/**
 * PROGRESS STEPS — segmented gold bar that fills step by step. Visualizes
 * anything gradual (vesting, plazos, etapas de implementación).
 * Function: comprensión.
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  label,
  steps = 4,
  stepLabels,
  percent = true,
  caption,
  fillSec,
  position = "auto",
  tone = "auto",
}) => {
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope(8, 10);
  const tc = toneColors(useTone(tone));
  const head = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: easings.easeOut });
  const fillEnd = fillSec ? Math.round(fillSec * fps) : Math.round(durationInFrames * 0.75);
  const fill = interpolate(frame, [8, Math.max(9, fillEnd)], [0, steps], { ...clamp, easing: easings.easeInOut });
  const barW = 760 * k;
  const gap = 10 * k;
  const segW = (barW - gap * (steps - 1)) / steps;
  return (
    <Stage position={position}>
      <div style={{ opacity: env, position: "relative", padding: `${20 * k}px ${24 * k}px`, width: barW + 48 * k }}>
        <CornerBrackets progress={head} k={k} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 * k }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * k }}>
            <div style={{ width: 34 * k * head, height: 3 * k, background: colors.gold }} />
            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 700,
                fontSize: 28 * k,
                letterSpacing: 6 * k,
                textTransform: "uppercase",
                color: tc.accent,
                textShadow: tc.shadow,
              }}
            >
              {label}
            </div>
          </div>
          {percent ? (
            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 300,
                fontSize: 64 * k,
                lineHeight: 1,
                color: tc.text,
                textShadow: tc.shadow,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round((fill / steps) * 100)}
              <span style={{ fontSize: 34 * k, color: tc.accent }}>%</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap }}>
          {Array.from({ length: steps }).map((_, i) => {
            const f = Math.max(0, Math.min(1, fill - i));
            return (
              <div key={i} style={{ width: segW, height: 16 * k, border: `${1.5 * k}px solid ${tc.line}`, borderRadius: 2 * k, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${f * 100}%`, background: colors.gold, boxShadow: f > 0 && f < 1 ? `0 0 ${14 * k}px ${colors.gold}` : "none" }} />
              </div>
            );
          })}
        </div>
        {stepLabels ? (
          <div style={{ display: "flex", gap, marginTop: 10 * k }}>
            {stepLabels.map((s, i) => (
              <div key={i} style={{ width: segW, fontFamily: fonts.sans, fontSize: 22 * k, letterSpacing: 2 * k, color: tc.sub, textTransform: "uppercase", textShadow: tc.shadow }}>
                {s}
              </div>
            ))}
          </div>
        ) : null}
        {caption ? (
          <div style={{ marginTop: 16 * k, fontFamily: fonts.sans, fontSize: 40 * k, color: tc.text, textShadow: tc.shadow, opacity: head }}>{caption}</div>
        ) : null}
      </div>
    </Stage>
  );
};
