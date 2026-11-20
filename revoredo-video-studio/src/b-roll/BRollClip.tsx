import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import type { BRoll } from "../schema/edit";
import { colors, fonts, scaleFor, type as t } from "../brand/tokens";
import { clamp, easings } from "../lib/anim";

const gradeFilter: Record<BRoll["grade"], string> = {
  none: "none",
  cool: "saturate(0.85) contrast(1.05) hue-rotate(-6deg)",
  warm: "saturate(0.95) sepia(0.12) contrast(1.04)",
  mono: "grayscale(1) contrast(1.1)",
};

/** Placeholder rendered while a b-roll slot has not been sourced yet. */
const Pending: React.FC<{ b: BRoll }> = ({ b }) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(135deg, ${colors.inkSoft} 0 ${24 * k}px, ${colors.graphite} ${24 * k}px ${48 * k}px)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 90 * k,
        gap: 22 * k,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, letterSpacing: 6 * k, fontSize: t.label * k, color: colors.gold }}>
        B-ROLL PENDIENTE · {b.id}
      </div>
      <div style={{ fontFamily: fonts.serif, fontSize: t.subtitle * 1.1 * k, color: colors.white, lineHeight: 1.15 }}>
        {b.description}
      </div>
      {b.searchQuery ? (
        <div style={{ fontFamily: fonts.sans, fontSize: t.micro * k, color: colors.mist }}>búsqueda: “{b.searchQuery}”</div>
      ) : null}
    </AbsoluteFill>
  );
};

const Media: React.FC<{ b: BRoll }> = ({ b }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  if (!b.src) return <Pending b={b} />;
  const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", filter: gradeFilter[b.grade] };
  if (b.kind === "image") {
    const s = b.kenBurns
      ? interpolate(frame, [0, durationInFrames], [1.04, 1.12], { ...clamp, easing: easings.easeInOut })
      : 1;
    return (
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        <Img src={staticFile(b.src)} style={style} />
      </AbsoluteFill>
    );
  }
  // Subtle push on video b-roll too: keeps motion constant, hides stock "stillness".
  const s = interpolate(frame, [0, durationInFrames], [1.02, 1.08], clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})` }}>
      <Video
        src={staticFile(b.src)}
        trimBefore={Math.round(b.trimStart * fps)}
        playbackRate={b.playbackRate}
        volume={b.volume}
        muted={b.volume === 0}
        objectFit="cover"
        style={{ width: "100%", height: "100%", filter: gradeFilter[b.grade] }}
      />
    </AbsoluteFill>
  );
};

/**
 * B-roll layer. Layouts:
 *  full      replaces the presenter (voice continues) — the reference default.
 *  split-top b-roll in the upper 55%, presenter keeps the lower part.
 *  card      framed inset over the presenter, for documents / screens.
 */
export const BRollClip: React.FC<{ b: BRoll }> = ({ b }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const k = scaleFor(width);
  const enter = interpolate(frame, [0, 6], [0, 1], { ...clamp, easing: easings.easeOut });
  if (b.layout === "full") {
    return (
      <AbsoluteFill>
        <Media b={b} />
        {/* Soft vignette so white captions stay legible over any stock. */}
        <AbsoluteFill
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 100%)" }}
        />
      </AbsoluteFill>
    );
  }
  if (b.layout === "split-top") {
    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: height * 0.55,
            overflow: "hidden",
            clipPath: `inset(0 0 ${(1 - enter) * 100}% 0)`,
            borderBottom: `${3 * k}px solid ${colors.gold}`,
          }}
        >
          <Media b={b} />
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: height * 0.17,
          width: width * 0.8,
          height: width * 0.8 * 0.75,
          borderRadius: 22 * k,
          overflow: "hidden",
          boxShadow: `0 ${24 * k}px ${80 * k}px rgba(0,0,0,0.45)`,
          border: `${2 * k}px solid rgba(255,255,255,0.18)`,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 30 * k}px)`,
        }}
      >
        <Media b={b} />
      </div>
    </AbsoluteFill>
  );
};
