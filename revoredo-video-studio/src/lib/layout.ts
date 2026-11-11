import { createContext } from "react";
import type { Edit } from "../schema/edit";
import { mapRange, type Timeline } from "./timeline";
import { scaleOf } from "../framing/presets";
import { captionLayout } from "../brand/tokens";

/**
 * FACE-SAFE GRAPHIC ZONES
 *
 * Graphics must never cover the presenter's face. Given the face box measured
 * in the raw (edit.layout.faceTop/faceBottom, fractions of height, set in
 * PASO 1) and the reframe of the segment underneath, we compute the free
 * bands of the frame and place "auto" graphics in the largest one:
 *   top band     safe top → face top
 *   middle band  face bottom → caption band
 * Over full-screen b-roll the whole upper half is free.
 */
export type Zone = {
  top: number;
  bottom: number;
  band: "top" | "middle" | "broll" | "default";
  /** Text tone for text-only graphics: "light" text on dark backdrops, "ink" on light ones. */
  tone: "light" | "ink";
};

export const ZoneContext = createContext<Zone | null>(null);

const SAFE_TOP = 0.075;
const MARGIN = 0.018;

export const zoneAt = (edit: Edit, tl: Timeline, frame: number): Zone => {
  const captionTop = captionLayout.centerY - 0.035;
  const onBroll = edit.broll.some((b) => {
    if (b.layout !== "full") return false;
    const r = mapRange(tl, b);
    return r && frame >= r.from && frame < r.from + r.durationInFrames;
  });
  if (onBroll) return { top: 0.14, bottom: 0.58, band: "broll", tone: "light" };
  const seg = tl.segments.find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames);
  const tone = edit.layout.backdrop === "light" ? "ink" : "light";
  if (!seg) return { top: 0.12, bottom: 0.5, band: "default", tone };
  const s = scaleOf(seg.framing) * Math.max(seg.framing.zoomFrom, seg.framing.zoomTo);
  const f = seg.framing.focusY;
  const map = (y: number) => f + (y - f) * s;
  const faceTop = map(edit.layout.faceTop);
  const faceBottom = map(edit.layout.faceBottom);
  const topBand = { top: SAFE_TOP, bottom: faceTop - MARGIN };
  const midBand = { top: faceBottom + MARGIN, bottom: captionTop };
  const th = topBand.bottom - topBand.top;
  const mh = midBand.bottom - midBand.top;
  // The middle band sits on the presenter's clothes: keep light text there.
  return th >= mh ? { ...topBand, band: "top", tone } : { ...midBand, band: "middle", tone: "light" };
};
