import React from "react";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import type { Edit } from "../schema/edit";
import { mapPoint, type Timeline } from "../lib/timeline";
import { clamp } from "../lib/anim";

/**
 * Audio configuration (see documentation/07-audio.md):
 *  - Voice is the hero. Target −14 LUFS integrated / −1 dBTP for the export.
 *  - Music bed sits ~20 dB under the voice (volume ≈ 0.08–0.14), corporate,
 *    low-tempo, no lyrics. Fades in/out; dips further under b-roll.
 *  - SFX are punctuation, not decoration: max one every ~6–8 s, ≤ 0.4 volume.
 */
export const AudioBed: React.FC<{ edit: Edit; timeline: Timeline; brollRanges: [number, number][] }> = ({
  edit,
  timeline,
  brollRanges,
}) => {
  const { fps } = useVideoConfig();
  const m = edit.audio.music;
  const total = timeline.totalFrames;
  return (
    <>
      {m ? (
        <Audio
          src={staticFile(m.src)}
          trimBefore={Math.round(m.trimStart * fps)}
          loop
          volume={(f) => {
            const fade = Math.min(
              interpolate(f, [0, m.fadeInSec * fps], [0, 1], clamp),
              interpolate(f, [total - m.fadeOutSec * fps, total], [1, 0], clamp),
            );
            const ducked = brollRanges.some(([a, b]) => f >= a && f < b);
            // Rise into the end card (no voice there), over 0.5 s.
            const boost = interpolate(f, [timeline.bodyFrames - 0.5 * fps, timeline.bodyFrames], [1, m.endBoost], clamp);
            return Math.min(1, (ducked ? m.duckedVolume : m.volume) * fade * boost);
          }}
        />
      ) : null}
      {edit.audio.sfx.map((s, i) => {
        const at = mapPoint(timeline, s);
        if (at === null) return null;
        return (
          <Sequence key={i} from={at} durationInFrames={Math.round(3 * fps)} layout="none">
            <Audio src={staticFile(s.src)} volume={s.volume} />
          </Sequence>
        );
      })}
    </>
  );
};
