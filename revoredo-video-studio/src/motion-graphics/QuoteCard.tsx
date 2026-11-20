import React from "react";
import { useVideoConfig } from "remotion";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { useEnvelope, useStagger } from "../lib/anim";
import { Card, Stage, type Position } from "./primitives";

export type QuoteCardProps = {
  quote: string;
  attribution?: string;
  position?: Position;
};

/**
 * Literal quote of a norm, resolution or authority. Use only for short,
 * verifiable quotes. Function: comprensión + autoridad.
 */
export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, attribution, position = "auto" }) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope();
  const p = useStagger(0);
  const pa = useStagger(3);
  return (
    <Stage position={position}>
      <div style={{ opacity: env, maxWidth: 880 * k }}>
        <Card k={k} style={{ textAlign: "left" }}>
          <div style={{ fontFamily: fonts.serif, fontSize: 110 * k, color: colors.gold, lineHeight: 0.6, height: 50 * k }}>
            “
          </div>
          <div
            style={{
              fontFamily: fonts.serif,
              fontStyle: "italic",
              fontSize: t.subtitle * 1.15 * k,
              lineHeight: 1.18,
              color: colors.white,
              opacity: p,
            }}
          >
            {quote}
          </div>
          {attribution ? (
            <div
              style={{
                marginTop: 20 * k,
                fontFamily: fonts.sans,
                fontSize: t.micro * k,
                letterSpacing: 2.5 * k,
                textTransform: "uppercase",
                color: colors.mist,
                opacity: pa,
              }}
            >
              — {attribution}
            </div>
          ) : null}
        </Card>
      </div>
    </Stage>
  );
};
