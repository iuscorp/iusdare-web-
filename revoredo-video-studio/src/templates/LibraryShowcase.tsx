import React from "react";
import { AbsoluteFill, Series } from "remotion";
import "../brand/fonts";
import { colors } from "../brand/tokens";
import { LogoBug } from "../components/brand/LogoMark";
import {
  AccentLine,
  AcronymReveal,
  CTAEndCard,
  DataCard,
  KeyPoints,
  LegalReference,
  LowerThird,
  QuoteCard,
  ProgressSteps,
  StrategicText,
  TechList,
} from "../motion-graphics";

/** Neutral stand-in for footage: the cool grey office tone of the reference set. */
const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 80% at 50% 35%, ${colors.mist} 0%, ${colors.steel} 55%, ${colors.inkSoft} 100%)`,
    }}
  >
    {children}
    <LogoBug />
  </AbsoluteFill>
);

export const SHOWCASE_ITEM_FRAMES = 75;

/**
 * Brand library review reel: every reusable motion graphic, in sequence, on a
 * neutral backdrop. Render it after any change to tokens or components.
 */
export const LibraryShowcase: React.FC = () => {
  const items: React.ReactNode[] = [
    <StrategicText key="st" kicker="Caso real" text="El problema no fue la biometría" emphasis="biometría" />,
    <DataCard key="dc" prefix="S/ " value={139} suffix=" mil" label="Multa a un gimnasio por recopilar huellas" note="ANPD · 2026" />,
    <KeyPoints key="kp" title="Consentimiento válido" items={["Previo", "Específico", "Informado"]} revealEverySec={0.45} />,
    <LegalReference key="lr" reference="Ley N.º 29733" authority="Autoridad Nacional de Protección de Datos Personales" detail="Ley de Protección de Datos Personales" />,
    <LowerThird key="lt" name="Nombre Apellido" role="Abogada · Revoredo Abogados" />,
    <QuoteCard key="qc" quote="El consentimiento no se presume. Se acredita." attribution="Revoredo Abogados" />,
    <TechList key="tl" title="Condiciones" items={["Permanencia", "Desempeño", "Hitos específicos"]} revealEverySec={0.45} />,
    <ProgressSteps key="ps" label="Participación" caption="Adquisición progresiva" fillSec={2} />,
    <AcronymReveal key="ar" parts={[{ key: "P", label: "Prevención" }, { key: "LA", label: "Lavado de Activos" }, { key: "FT", label: "Financiamiento del Terrorismo" }]} revealAt={[0.3, 0.9, 1.5]} />,
    <AccentLine key="al" />,
    <CTAEndCard key="cta" />,
  ];
  return (
    <AbsoluteFill style={{ background: colors.ink }}>
      <Series>
        {items.map((node, i) => (
          <Series.Sequence key={i} durationInFrames={SHOWCASE_ITEM_FRAMES}>
            <Backdrop>{node}</Backdrop>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
