import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, scaleFor } from "../brand/tokens";
import { clamp, easings, useEnvelope } from "../lib/anim";
import { Stage, useTone, type Position, type Tone } from "./primitives";
import { CornerBrackets, DiamondNode, toneColors } from "./tech";

export type TechListProps = {
  /** Small uppercase label with the revoredo.pe gold rule. */
  title?: string;
  items: string[];
  /** Seconds from the graphic's start at which each item appears (sync to the voice). */
  revealAt?: number[];
  revealEverySec?: number;
  /** Show 01 / 02 / 03 indices. */
  numbered?: boolean;
  /** First index shown (to continue a list split in two: 5 → 05, 06…). */
  startIndex?: number;
  /** Tighter rows. Defaults to true from 4 items, so lists fit the band above the head. */
  compact?: boolean;
  position?: Position;
  tone?: Tone | "auto";
};

/**
 * TECH LIST — no box. A gold spine draws down; each item arrives with a
 * diamond node, an index and a hairline connector, then the label wipes in.
 * Replaces the boxed KeyPoints for a "Abogados Digitales" look.
 * Function: comprensión (requisitos, condiciones, pasos).
 */
export const TechList: React.FC<TechListProps> = ({
  title,
  items,
  revealAt,
  revealEverySec = 0.7,
  numbered = true,
  startIndex = 1,
  compact,
  position = "auto",
  tone = "auto",
}) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope(8, 10);
  const tc = toneColors(useTone(tone));
  const at = items.map((_, i) => Math.round((revealAt?.[i] ?? 0.25 + i * revealEverySec) * fps));
  const head = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: easings.easeOut });
  const tight = compact ?? items.length >= 4;
  const rowH = (tight ? 58 : 74) * k;
  // spine grows to the last revealed item
  const revealed = at.filter((a) => frame >= a).length;
  const spineTarget = revealed === 0 ? 0 : (revealed - 0.5) * rowH;
  const spinePrev = revealed <= 1 ? 0 : (revealed - 1.5) * rowH;
  const lastAt = at[Math.max(0, revealed - 1)] ?? 0;
  const spine = interpolate(frame, [lastAt, lastAt + 10], [spinePrev, spineTarget], { ...clamp, easing: easings.easeOut });

  return (
    <Stage position={position}>
      <div style={{ opacity: env, position: "relative", padding: `${18 * k}px ${26 * k}px`, minWidth: 600 * k }}>
        <CornerBrackets progress={head} k={k} />
        {title ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 * k, marginBottom: (tight ? 10 : 20) * k, opacity: head }}>
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
              {title}
            </div>
          </div>
        ) : null}
        <div style={{ position: "relative" }}>
          {/* spine */}
          <div style={{ position: "absolute", left: 8 * k, top: rowH / 2, width: 2 * k, height: Math.max(0, spine), background: colors.gold, opacity: 0.85 }} />
          {items.map((it, i) => {
            const p = interpolate(frame, [at[i], at[i] + 10], [0, 1], { ...clamp, easing: easings.easeOut });
            const line = interpolate(frame, [at[i] + 3, at[i] + 12], [0, 1], { ...clamp, easing: easings.easeOut });
            const text = interpolate(frame, [at[i] + 6, at[i] + 18], [0, 100], { ...clamp, easing: easings.easeOut });
            return (
              <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", gap: 16 * k, opacity: p > 0 ? 1 : 0 }}>
                <DiamondNode progress={p} k={k} />
                <div style={{ width: 46 * k * line, height: 1.5 * k, background: tc.line }} />
                {numbered ? (
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontWeight: 400,
                      fontSize: 32 * k,
                      color: tc.accent,
                      letterSpacing: 2 * k,
                      opacity: line,
                      textShadow: tc.shadow,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(i + startIndex).padStart(2, "0")}
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontWeight: 400,
                    fontSize: (tight ? 46 : 56) * k,
                    color: tc.text,
                    textShadow: tc.shadow,
                    clipPath: `inset(0 ${100 - text}% 0 0)`,
                    whiteSpace: "nowrap",
                    letterSpacing: 0.2 * k,
                  }}
                >
                  {it}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};
