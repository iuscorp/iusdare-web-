import React from "react";
import { useVideoConfig } from "remotion";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { useEnvelope, useStagger } from "../lib/anim";
import { GoldRule, Stage, type Position } from "./primitives";

export type LowerThirdProps = {
  name: string;
  role: string;
  position?: Position;
};

/**
 * Presenter identification. Use once, in the first 3–6 s after the hook,
 * never on top of the hook itself. Function: autoridad / comprensión.
 */
export const LowerThird: React.FC<LowerThirdProps> = ({ name, role, position = "lower" }) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope();
  const p0 = useStagger(0);
  const p1 = useStagger(2);
  return (
    <Stage position={position} align="left">
      <div style={{ opacity: env, display: "flex", flexDirection: "column", gap: 10 * k }}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: t.subtitle * 1.2 * k,
            color: colors.white,
            opacity: p0,
            transform: `translateX(${(1 - p0) * 24 * k}px)`,
            textShadow: `0 ${2 * k}px ${14 * k}px rgba(0,0,0,0.5)`,
          }}
        >
          {name}
        </div>
        <GoldRule progress={p1} width={220 * k} k={k} align="left" />
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 500,
            fontSize: t.label * k,
            letterSpacing: 3 * k,
            textTransform: "uppercase",
            color: colors.paper,
            opacity: p1,
            textShadow: `0 ${2 * k}px ${10 * k}px rgba(0,0,0,0.5)`,
          }}
        >
          {role}
        </div>
      </div>
    </Stage>
  );
};
