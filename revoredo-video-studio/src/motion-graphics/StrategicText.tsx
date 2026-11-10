import React from "react";
import { useVideoConfig } from "remotion";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { useEnvelope, useStagger } from "../lib/anim";
import { GoldRule, Stage, withEmphasis, type Position } from "./primitives";

export type StrategicTextProps = {
  /** Small sans label above (e.g. "DATO", "OJO", "CASO REAL"). Optional. */
  kicker?: string;
  text: string;
  /** Substring of `text` rendered in gold. */
  emphasis?: string;
  position?: Position;
  size?: "title" | "headline";
  rule?: boolean;
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
}) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
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
              color: colors.gold,
              textTransform: "uppercase",
              opacity: p0,
              textShadow: `0 ${2 * k}px ${10 * k}px rgba(0,0,0,0.45)`,
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
            color: colors.white,
            letterSpacing: -1 * k,
            transform: `translateY(${(1 - p1) * 24 * k}px)`,
            opacity: p1,
            textShadow: `0 ${3 * k}px ${22 * k}px rgba(0,0,0,0.5)`,
          }}
        >
          {withEmphasis(text, emphasis)}
        </div>
        {rule ? <GoldRule progress={p2} width={160 * k} k={k} /> : null}
      </div>
    </Stage>
  );
};
