import React from "react";
import { useVideoConfig } from "remotion";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { useEnvelope, useStagger } from "../lib/anim";
import { Stage, type Position } from "./primitives";

export type LegalReferenceProps = {
  /** Authority or norm, e.g. "Autoridad Nacional de Protección de Datos Personales". */
  authority: string;
  /** Short reference: "Ley N.º 29733", "Res. Directoral N.º …". */
  reference?: string;
  detail?: string;
  position?: Position;
};

/**
 * Authority chip: cites the institution / norm being mentioned. Small,
 * left-aligned, gold vertical rule. Function: comprensión (y autoridad).
 */
export const LegalReference: React.FC<LegalReferenceProps> = ({
  authority,
  reference,
  detail,
  position = "auto",
}) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope();
  const pr = useStagger(0);
  const pt = useStagger(2);
  return (
    <Stage position={position} align="left">
      <div
        style={{
          opacity: env,
          display: "flex",
          gap: 26 * k,
          background: "rgba(17,18,20,0.66)",
          backdropFilter: `blur(${14 * k}px)`,
          padding: `${26 * k}px ${34 * k}px ${26 * k}px ${26 * k}px`,
          borderRadius: 14 * k,
          maxWidth: 860 * k,
        }}
      >
        <div style={{ width: 4 * k, background: colors.gold, borderRadius: 2 * k, transform: `scaleY(${pr})`, transformOrigin: "top" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 * k, opacity: pt }}>
          {reference ? (
            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 600,
                fontSize: t.label * k,
                letterSpacing: 4 * k,
                textTransform: "uppercase",
                color: colors.gold,
              }}
            >
              {reference}
            </div>
          ) : null}
          <div style={{ fontFamily: fonts.serif, fontSize: t.subtitle * k, color: colors.white, lineHeight: 1.1 }}>
            {authority}
          </div>
          {detail ? (
            <div style={{ fontFamily: fonts.sans, fontSize: t.micro * 1.15 * k, color: colors.mist, lineHeight: 1.3 }}>
              {detail}
            </div>
          ) : null}
        </div>
      </div>
    </Stage>
  );
};
