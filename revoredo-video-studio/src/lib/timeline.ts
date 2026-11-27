import type { Edit, Segment } from "../schema/edit";

export type PlacedSegment = Segment & {
  index: number;
  startFrame: number;
  durationInFrames: number;
};

export type Timeline = {
  fps: number;
  segments: PlacedSegment[];
  bodyFrames: number;
  endCardFrames: number;
  totalFrames: number;
};

export const buildTimeline = (edit: Edit): Timeline => {
  const fps = edit.meta.fps;
  let acc = 0;
  const segments = edit.segments.map((s, index) => {
    const durationInFrames = Math.max(1, Math.round((s.out - s.in) * fps));
    const placed = { ...s, index, startFrame: acc, durationInFrames };
    acc += durationInFrames;
    return placed;
  });
  const endCardFrames = edit.endCard.enabled ? Math.round(edit.endCard.durationSec * fps) : 0;
  return { fps, segments, bodyFrames: acc, endCardFrames, totalFrames: acc + endCardFrames };
};

/** Source second → output frame, or null if that moment was cut out. */
export const sourceToOutput = (tl: Timeline, source: string, t: number): number | null => {
  for (const s of tl.segments) {
    if (s.source === source && t >= s.in && t < s.out) {
      return s.startFrame + Math.round((t - s.in) * tl.fps);
    }
  }
  return null;
};

/**
 * Maps a [start, end] range to output frames. Ranges that straddle a cut are
 * clipped to the kept portion; if nothing of it survives the edit → null.
 */
export const mapRange = (
  tl: Timeline,
  r: { start: number; end: number; clock: "source" | "output"; source: string },
): { from: number; durationInFrames: number } | null => {
  if (r.clock === "output") {
    const from = Math.round(r.start * tl.fps);
    const to = Math.round(r.end * tl.fps);
    return to > from ? { from, durationInFrames: to - from } : null;
  }
  let first: number | null = null;
  let last: number | null = null;
  for (const s of tl.segments) {
    if (s.source !== r.source) continue;
    const a = Math.max(r.start, s.in);
    const b = Math.min(r.end, s.out);
    if (b <= a) continue;
    const fa = s.startFrame + Math.round((a - s.in) * tl.fps);
    const fb = s.startFrame + Math.round((b - s.in) * tl.fps);
    first = first === null ? fa : Math.min(first, fa);
    last = last === null ? fb : Math.max(last, fb);
  }
  if (first === null || last === null || last <= first) return null;
  return { from: first, durationInFrames: last - first };
};

export const mapPoint = (
  tl: Timeline,
  p: { at: number; clock: "source" | "output"; source: string },
): number | null =>
  p.clock === "output" ? Math.round(p.at * tl.fps) : sourceToOutput(tl, p.source, p.at);

export const formatTc = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
};
