import React from "react";
import { useVideoConfig } from "remotion";
import { fonts, scaleFor, type as t } from "../brand/tokens";
import { useEnvelope, useStagger } from "../lib/anim";
import { GoldRule, Stage, toneStyle, useTone, withEmphasis, type Position, type Tone } from "./primitives";

export type StrategicTextProps = {
  /** Small sans label above (e.g. "DATO", "OJO", "CASO REAL"). Optional. */
  kicker?: string;
  text: string;
  /** Substring of `text` rendered in gold. */
  emphasis?: string;
  position?: Position;
  size?: "title" | "headline";
  rule?: boolean;
  /** "auto" follows edit.layout.backdrop (ink text on light walls). */
  tone?: Tone | "auto";
};

/**
 * Strategic text: the ONE idea the viewer must keep from this moment.
 * Function: énfasis / comprensión. Max ~7 words.
 */
export const StrategicText: React.FC<StrategicTextProps> = ({
  kicker,
  text,
  emphasis,
  position = "auto",
  size = "title",
  rule = true,
  tone = "auto",
}) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  const ts = toneStyle(useTone(tone), k);
  const env = useEnvelope();
  const p0 = useStagger(0);
  const p1 = useStagger(1, 4);
  const p2 = useStagger(3, 4);
  return (
    <Stage position={position}>
      <div style={{ opacity: env, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * k }}>
        {kicker ? (
          <div
            style={{
              fontFamily: fonts.sans,
              fontWeight: 600,
              fontSize: t.label * k,
              letterSpacing: 6 * k,
              color: ts.accent,
              textTransform: "uppercase",
              opacity: p0,
              textShadow: ts.shadow,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: (size === "headline" ? t.headline : t.title) * k,
            lineHeight: 1.02,
            color: ts.color,
            letterSpacing: -1 * k,
            transform: `translateY(${(1 - p1) * 24 * k}px)`,
            opacity: p1,
            textShadow: ts.shadow,
          }}
        >
          {withEmphasis(text, emphasis, ts.accent)}
        </div>
        {rule ? <GoldRule progress={p2} width={160 * k} k={k} /> : null}
      </div>
    </Stage>
  );
};
