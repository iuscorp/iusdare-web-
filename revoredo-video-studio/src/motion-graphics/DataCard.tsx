import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { clamp, easings, useEnvelope, useStagger } from "../lib/anim";
import { Card, GoldRule, Stage, type Position } from "./primitives";

export type DataCardProps = {
  /** Numeric value to display (counts up when countUp). */
  value: number;
  prefix?: string;
  suffix?: string;
  /** Decimal places / thousands separator for es-PE. */
  decimals?: number;
  label: string;
  /** Optional source line (resolución, informe). Builds authority. */
  note?: string;
  countUp?: boolean;
  position?: Position;
  card?: boolean;
};

const fmt = (n: number, decimals: number) =>
  n.toLocaleString("es-PE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Data card: a single figure that makes the risk tangible (multa, UIT, nº de
 * afectados). Function: comprensión + énfasis.
 */
export const DataCard: React.FC<DataCardProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  note,
  countUp = true,
  position = "auto",
  card = true,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  const env = useEnvelope();
  const pv = useStagger(0);
  const pl = useStagger(2);
  const count = countUp
    ? interpolate(frame, [2, 24], [0, value], { ...clamp, easing: easings.easeOut })
    : value;
  const body = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * k }}>
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: t.dataNumber * k,
          lineHeight: 0.9,
          color: colors.white,
          letterSpacing: -4 * k,
          opacity: pv,
          transform: `scale(${0.96 + 0.04 * pv})`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ fontSize: t.title * k, color: colors.gold, marginRight: 10 * k }}>{prefix}</span>
        {fmt(count, decimals)}
        <span style={{ fontSize: t.title * k, color: colors.gold }}>{suffix}</span>
      </div>
      <GoldRule progress={pl} width={120 * k} k={k} />
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 500,
          fontSize: t.body * k,
          color: colors.white,
          opacity: pl,
          maxWidth: 760 * k,
          lineHeight: 1.25,
        }}
      >
        {label}
      </div>
      {note ? (
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: t.micro * k,
            color: colors.mist,
            letterSpacing: 1.5 * k,
            textTransform: "uppercase",
            opacity: pl * 0.9,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
  return (
    <Stage position={position}>
      <div style={{ opacity: env }}>{card ? <Card k={k}>{body}</Card> : body}</div>
    </Stage>
  );
};
