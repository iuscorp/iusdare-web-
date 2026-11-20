import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { useEnvelope } from "../lib/anim";
import { spring } from "remotion";
import { motion } from "../brand/tokens";
import { Card, Stage, type Position } from "./primitives";

export type KeyPointsProps = {
  title?: string;
  items: string[];
  mode?: "check" | "number" | "cross";
  /** Seconds between items. Align to the moment each item is spoken. */
  revealEverySec?: number;
  /** Optional explicit reveal offsets (seconds from graphic start) per item. */
  revealAt?: number[];
  position?: Position;
};

/**
 * Requirements / checklist (p. ej. consentimiento previo · específico ·
 * informado). Items appear as they are spoken. Function: comprensión.
 */
export const KeyPoints: React.FC<KeyPointsProps> = ({
  title,
  items,
  mode = "check",
  revealEverySec = 0.7,
  revealAt,
  position = "auto",
}) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope();
  const mark = (i: number) => (mode === "number" ? String(i + 1).padStart(2, "0") : mode === "cross" ? "✕" : "✓");
  const markColor = mode === "cross" ? colors.risk : colors.gold;
  return (
    <Stage position={position}>
      <div style={{ opacity: env }}>
        <Card k={k} style={{ minWidth: 640 * k }}>
          {title ? (
            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 600,
                fontSize: t.label * k,
                letterSpacing: 5 * k,
                textTransform: "uppercase",
                color: colors.gold,
                marginBottom: 22 * k,
                textAlign: "left",
              }}
            >
              {title}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 * k }}>
            {items.map((it, i) => {
              const at = Math.round((revealAt?.[i] ?? i * revealEverySec) * fps);
              const p = spring({ frame: frame - at, fps, config: motion.spring, durationInFrames: motion.enter });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24 * k,
                    opacity: p,
                    transform: `translateX(${(1 - p) * 30 * k}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 56 * k,
                      height: 56 * k,
                      borderRadius: 28 * k,
                      border: `${2 * k}px solid ${markColor}`,
                      color: markColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.sans,
                      fontWeight: 600,
                      fontSize: (mode === "number" ? 24 : 28) * k,
                      flexShrink: 0,
                    }}
                  >
                    {mark(i)}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: t.subtitle * 1.15 * k,
                      color: colors.white,
                      textAlign: "left",
                      lineHeight: 1.1,
                    }}
                  >
                    {it}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </Stage>
  );
};
