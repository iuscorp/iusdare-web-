import type React from "react";
import { AccentLine } from "./AccentLine";
import { CTAEndCard } from "./CTAEndCard";
import { DataCard } from "./DataCard";
import { KeyPoints } from "./KeyPoints";
import { LegalReference } from "./LegalReference";
import { LowerThird } from "./LowerThird";
import { QuoteCard } from "./QuoteCard";
import { StrategicText } from "./StrategicText";

/** Registry used by the EDL (`graphics[].component`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const graphicsRegistry: Record<string, React.FC<any>> = {
  StrategicText,
  DataCard,
  KeyPoints,
  LegalReference,
  LowerThird,
  QuoteCard,
  AccentLine,
  CTAEndCard,
};

export { AccentLine, CTAEndCard, DataCard, KeyPoints, LegalReference, LowerThird, QuoteCard, StrategicText };
