import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, scaleFor } from "../brand/tokens";
import { clamp, easings, useEnvelope } from "../lib/anim";
import { Stage, useTone, type Position, type Tone } from "./primitives";
import { CornerBrackets, toneColors } from "./tech";

export type AcronymRevealProps = {
  /** Acronym parts, e.g. [{key:"P",label:"Prevención"},{key:"LA",label:"Lavado de Activos"},…]. */
  parts: { key: string; label: string }[];
  /** Seconds (from start) at which each part's label is spoken. */
  revealAt?: number[];
  position?: Position;
  tone?: Tone | "auto";
};

/**
 * ACRONYM REVEAL — the acronym appears as light Lato letters separated by gold
 * rules; each block lights up in gold and drops its meaning when spoken.
 * For PLAFT, KYC, UIF, LPDP… Function: comprensión.
 */
export const AcronymReveal: React.FC<AcronymRevealProps> = ({ parts, revealAt, position = "auto", tone = "auto" }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope(8, 10);
  const tc = toneColors(useTone(tone));
  const head = interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: easings.easeOut });
  const at = parts.map((_, i) => Math.round((revealAt?.[i] ?? 0.4 + i * 0.8) * fps));
  return (
    <Stage position={position}>
      <div style={{ opacity: env, position: "relative", padding: `${22 * k}px ${30 * k}px` }}>
        <CornerBrackets progress={head} k={k} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 26 * k }}>
          {parts.map((p, i) => {
            const on = interpolate(frame, [at[i], at[i] + 8], [0, 1], { ...clamp, easing: easings.easeOut });
            const lab = interpolate(frame, [at[i] + 3, at[i] + 14], [0, 1], { ...clamp, easing: easings.easeOut });
            return (
              <React.Fragment key={i}>
                {i > 0 ? <div style={{ width: 2 * k, height: 150 * k, background: colors.gold, opacity: 0.35 + 0.65 * head, transform: `scaleY(${head})` }} /> : null}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 150 * k, maxWidth: 270 * k }}>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontWeight: 300,
                      fontSize: 104 * k,
                      lineHeight: 1,
                      letterSpacing: 4 * k,
                      color: on > 0.5 ? tc.accent : tc.text,
                      opacity: 0.45 + 0.55 * Math.max(head * 0.6, on),
                      textShadow: tc.shadow,
                    }}
                  >
                    {p.key}
                  </div>
                  <div style={{ width: 60 * k * on, height: 3 * k, background: colors.gold, margin: `${12 * k}px 0` }} />
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontWeight: 400,
                      fontSize: 30 * k,
                      lineHeight: 1.15,
                      textAlign: "center",
                      color: tc.text,
                      textShadow: tc.shadow,
                      opacity: lab,
                      transform: `translateY(${(1 - lab) * 10 * k}px)`,
                    }}
                  >
                    {p.label}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};
