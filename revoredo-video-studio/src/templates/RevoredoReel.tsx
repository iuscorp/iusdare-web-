import React, { useMemo } from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, staticFile, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { z } from "zod";
import "../brand/fonts";
import { colors } from "../brand/tokens";
import { editSchema, formats, type Edit } from "../schema/edit";
import { buildTimeline, mapRange } from "../lib/timeline";
import { Reframe } from "../framing/Reframe";
import { Captions } from "../components/text/Captions";
import { LogoBug } from "../components/brand/LogoMark";
import { BRollClip } from "../b-roll/BRollClip";
import { graphicsRegistry } from "../motion-graphics";
import { CTAEndCard } from "../motion-graphics/CTAEndCard";
import { DipAccent, FlashAccent, LightLeakAccent } from "../transitions/CutAccents";
import { AudioBed } from "../audio/AudioBed";
import { ZoneContext, zoneAt } from "../lib/layout";

export const reelSchema = z.object({
  /** Full EDL (projects/<slug>/edit.json). */
  edit: editSchema,
  /** Draft mode: hides nothing, adds a small timecode/segment HUD for reviews. */
  hud: z.boolean().default(false),
});

export type ReelProps = z.input<typeof reelSchema>;

const dbToGain = (db: number) => Math.min(1, Math.pow(10, db / 20));

export const calculateReelMetadata: CalculateMetadataFunction<ReelProps> = ({ props }) => {
  const edit = editSchema.parse(props.edit);
  const tl = buildTimeline(edit);
  const { width, height } = formats[edit.meta.format];
  return { durationInFrames: tl.totalFrames, fps: edit.meta.fps, width, height, props: { ...props, edit } };
};

const Hud: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      position: "absolute",
      left: 24,
      top: 24,
      padding: "6px 12px",
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      fontFamily: "Inter",
      fontSize: 22,
      borderRadius: 6,
    }}
  >
    {label}
  </div>
);

/**
 * MAIN TEMPLATE — every Revoredo reel is this component driven by an EDL.
 *
 * Layer order (bottom → top):
 *  1. Presenter segments (direct cuts) with per-segment reframe/punch-in
 *  2. B-roll (voice continues underneath)
 *  3. Cut accents (flash / light leak) — only where the EDL asks for them
 *  4. Motion graphics
 *  5. Spoken captions
 *  6. Logo bug
 *  7. End card
 *  + Audio bed (music / sfx)
 */
export const RevoredoReel: React.FC<ReelProps> = (props) => {
  const edit: Edit = useMemo(() => editSchema.parse(props.edit), [props.edit]);
  const { fps } = useVideoConfig();
  const tl = useMemo(() => buildTimeline(edit), [edit]);
  const voice = dbToGain(edit.audio.voiceGainDb);

  const brolls = edit.broll
    .map((b) => ({ b, r: mapRange(tl, b) }))
    .filter((x): x is { b: (typeof edit.broll)[number]; r: NonNullable<ReturnType<typeof mapRange>> } => !!x.r);
  const brollRanges: [number, number][] = brolls.map(({ r }) => [r.from, r.from + r.durationInFrames]);

  return (
    <AbsoluteFill style={{ background: colors.ink }}>
      {/* 1. Presenter */}
      {tl.segments.map((s) => (
        <Sequence key={s.id} from={s.startFrame} durationInFrames={s.durationInFrames} name={`seg ${s.id} · ${s.role}`}>
          <Reframe framing={s.framing}>
            <Video
              src={staticFile(edit.sources[s.source])}
              trimBefore={Math.round(s.in * fps)}
              volume={voice * dbToGain(s.gainDb)}
              objectFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </Reframe>
          {props.hud ? <Hud label={`${s.id} · ${s.role} · ${s.framing.preset}`} /> : null}
        </Sequence>
      ))}

      {/* 2. B-roll */}
      {brolls.map(({ b, r }) => (
        <Sequence key={b.id} from={r.from} durationInFrames={r.durationInFrames} name={`b-roll ${b.id}`}>
          <BRollClip b={b} />
        </Sequence>
      ))}

      {/* 3. Cut accents */}
      {tl.segments
        .filter((s) => s.transitionIn !== "cut" && s.startFrame > 0)
        .map((s) => {
          const len = s.transitionIn === "light-leak" ? 24 : s.transitionIn === "dip" ? 10 : 8;
          return (
            <Sequence key={`acc-${s.id}`} from={s.startFrame - Math.floor(len / 2)} durationInFrames={len} name={`accent ${s.transitionIn}`}>
              {s.transitionIn === "flash" ? <FlashAccent /> : s.transitionIn === "light-leak" ? <LightLeakAccent seed={s.index} /> : <DipAccent />}
            </Sequence>
          );
        })}

      {/* 4. Motion graphics */}
      {edit.graphics.map((g) => {
        const r = mapRange(tl, g);
        const C = graphicsRegistry[g.component];
        if (!r || !C) return null;
        return (
          <Sequence key={g.id} from={r.from} durationInFrames={r.durationInFrames} name={`mg ${g.component}`}>
            <ZoneContext.Provider value={zoneAt(edit, tl, r.from + 1)}>
              <C {...g.props} />
            </ZoneContext.Provider>
          </Sequence>
        );
      })}

      {/* 5. Captions (hidden on the end card) */}
      <Captions edit={edit} timeline={tl} hideRanges={[[tl.bodyFrames, tl.totalFrames]]} />

      {/* 6. Logo bug */}
      {edit.showLogo ? (
        <Sequence durationInFrames={tl.bodyFrames} name="logo bug">
          <LogoBug />
        </Sequence>
      ) : null}

      {/* 7. End card */}
      {tl.endCardFrames > 0 ? (
        <Sequence from={tl.bodyFrames} durationInFrames={tl.endCardFrames} name="end card">
          <CTAEndCard line={edit.endCard.line} action={edit.endCard.action} />
        </Sequence>
      ) : null}

      <AudioBed edit={edit} timeline={tl} brollRanges={brollRanges} />
    </AbsoluteFill>
  );
};
