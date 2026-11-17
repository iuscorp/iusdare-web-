import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { captionLayout, colors, fonts, scaleFor, type as t } from "../../brand/tokens";
import type { Edit } from "../../schema/edit";
import { sourceToOutput, type Timeline } from "../../lib/timeline";
import { clamp } from "../../lib/anim";

type OutWord = { text: string; from: number; to: number; emphasis: boolean };
type Group = { words: OutWord[]; from: number; to: number };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9/]/g, "");

/**
 * Builds caption groups in OUTPUT time from a source-time word transcript.
 * Words inside cut-out ranges disappear; a new group starts at every cut so a
 * caption never straddles an edit point.
 */
/** Merges Whisper number splits ("130" ".000" → "130.000") and keeps punctuation info. */
const prepareWords = (words: Edit["captions"]["words"]) => {
  const out: { w: string; s: number; e: number }[] = [];
  for (const w of words) {
    const t = w.w.trim();
    if (!t) continue;
    const prev = out[out.length - 1];
    if (prev && /^[.,]\d/.test(t) && /\d[.,]?$/.test(prev.w)) {
      prev.w = prev.w.replace(/[.,]$/, "") + t;
      prev.e = w.e;
    } else out.push({ w: t, s: w.s, e: w.e });
  }
  return out;
};

/**
 * Builds caption groups in OUTPUT time from a source-time word transcript.
 * Words inside cut-out ranges disappear; a new group starts at every cut so a
 * caption never straddles an edit point. Trailing , . ; : are hidden on screen
 * (reference style) but still close a group.
 */
export const buildCaptionGroups = (edit: Edit, tl: Timeline): Group[] => {
  const c = edit.captions;
  const emph = new Set(c.emphasis.map(norm));
  const replace = new Map(Object.entries(c.replace).map(([k, v]) => [k.toLowerCase(), v]));
  const out: (OutWord & { stop: boolean })[] = [];
  for (const w of prepareWords(c.words)) {
    const stop = /[.?!,:;]$/.test(w.w);
    const core = w.w.replace(/[.,;:]+$/, "");
    const text = replace.get(w.w.toLowerCase()) ?? replace.get(core.toLowerCase()) ?? core;
    if (!text) continue;
    const from = sourceToOutput(tl, c.source, w.s + 0.001);
    if (from === null) continue;
    const toMapped = sourceToOutput(tl, c.source, Math.max(w.s + 0.001, w.e - 0.001));
    const to = toMapped === null ? from + Math.round(0.25 * tl.fps) : toMapped + 1;
    out.push({ text, from, to, emphasis: emph.has(norm(text)), stop });
  }
  const groups: Group[] = [];
  let cur: (OutWord & { stop?: boolean })[] = [];
  const flush = () => {
    if (cur.length) groups.push({ words: cur, from: cur[0].from, to: cur[cur.length - 1].to });
    cur = [];
  };
  for (let i = 0; i < out.length; i++) {
    const w = out[i];
    const prev = cur[cur.length - 1];
    const jump = prev && w.from - prev.to > Math.round(0.35 * tl.fps);
    const crossesCut = prev && tl.segments.some((s) => s.startFrame > prev.from && s.startFrame <= w.from);
    if (cur.length >= c.wordsPerGroup || jump || crossesCut || (prev && (prev as { stop?: boolean }).stop)) flush();
    cur.push(w);
  }
  flush();
  // Each group holds until the next one starts (no flicker), max +0.5s.
  for (let i = 0; i < groups.length; i++) {
    const next = groups[i + 1];
    const hold = groups[i].to + Math.round(0.5 * tl.fps);
    groups[i].to = next ? Math.min(next.from, hold) : hold;
  }
  return groups;
};

/**
 * Spoken captions — the reference style: centered, serif italic, white,
 * 2–4 words, soft shadow, no box. Active word at full opacity; emphasized
 * words in brand gold.
 */
export const Captions: React.FC<{ edit: Edit; timeline: Timeline; hideRanges?: [number, number][] }> = ({
  edit,
  timeline,
  hideRanges = [],
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const k = scaleFor(width);
  const groups = useMemo(() => buildCaptionGroups(edit, timeline), [edit, timeline]);
  if (!edit.captions.enabled) return null;
  if (hideRanges.some(([a, b]) => frame >= a && frame < b)) return null;
  const g = groups.find((x) => frame >= x.from && frame < x.to);
  if (!g) return null;
  const local = frame - g.from;
  const enter = interpolate(local, [0, 4], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: (width * (1 - captionLayout.maxWidth)) / 2,
          width: width * captionLayout.maxWidth,
          top: height * captionLayout.centerY,
          transform: `translateY(-50%) translateY(${(1 - enter) * 10 * k}px)`,
          opacity: enter,
          textAlign: "center",
          fontFamily: fonts.serif,
          fontStyle: "italic",
          fontSize: t.caption * k,
          lineHeight: 1.08,
          color: colors.white,
          // Light sets (white wall / light clothing): stronger dark halo for legibility.
          textShadow:
            edit.layout.backdrop === "light"
              ? `0 ${2 * k}px ${4 * k}px rgba(0,0,0,0.75), 0 0 ${14 * k}px rgba(0,0,0,0.7), 0 0 ${30 * k}px rgba(0,0,0,0.5)`
              : `0 ${2 * k}px ${14 * k}px rgba(0,0,0,0.55), 0 0 ${2 * k}px rgba(0,0,0,0.35)`,
          letterSpacing: -0.3 * k,
        }}
      >
        {g.words.map((w, i) => {
          const active = frame >= w.from;
          return (
            <span
              key={i}
              style={{
                color: w.emphasis ? colors.goldSoft : colors.white,
                opacity: active ? 1 : 0.55,
              }}
            >
              {w.text}
              {i < g.words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
