import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { brand, colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { useStagger } from "../lib/anim";
import { LogoMark } from "../components/brand/LogoMark";
import { GoldRule } from "./primitives";

export type CTAEndCardProps = {
  line?: string;
  action?: string;
  handle?: string;
  /** "solid" = full ink frame (end card). "overlay" = over footage. */
  variant?: "solid" | "overlay";
};

/**
 * Closing card. The brand's signature CTA: "Tenemos una conversación
 * pendiente". Function: retención (cierre del loop) + conversión.
 */
export const CTAEndCard: React.FC<CTAEndCardProps> = ({
  line = brand.signatureCta,
  action = "Escríbenos",
  handle = brand.handle,
  variant = "solid",
}) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  const p0 = useStagger(0);
  const p1 = useStagger(2);
  const p2 = useStagger(5);
  return (
    <AbsoluteFill
      style={{
        background: variant === "solid" ? colors.ink : "linear-gradient(180deg, rgba(17,18,20,0) 30%, rgba(17,18,20,0.85) 100%)",
        alignItems: "center",
        justifyContent: "center",
        gap: 40 * k,
        padding: 90 * k,
      }}
    >
      <div style={{ opacity: p0, transform: `scale(${0.9 + 0.1 * p0})` }}>
        <LogoMark size={110 * k} />
      </div>
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: t.title * k,
          lineHeight: 1.04,
          color: colors.white,
          textAlign: "center",
          opacity: p1,
          transform: `translateY(${(1 - p1) * 20 * k}px)`,
          letterSpacing: -1 * k,
        }}
      >
        {line}
      </div>
      <GoldRule progress={p2} width={160 * k} k={k} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * k, opacity: p2 }}>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: t.label * 1.1 * k,
            letterSpacing: 6 * k,
            textTransform: "uppercase",
            color: colors.gold,
          }}
        >
          {action}
        </div>
        <div style={{ fontFamily: fonts.sans, fontSize: t.label * k, color: colors.mist, letterSpacing: 1 * k }}>
          {handle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
