import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../brand/tokens";
import { clamp, easings } from "../lib/anim";
import { ZoneContext } from "../lib/layout";

/**
 * MG SCENE — a graphic played as its own full-frame shot (the presenter's voice
 * continues underneath), centered on a Revoredo tech backdrop instead of over
 * the presenter. Used with `"scene": true` in a graphic's props.
 *
 * Transition: a gold blade sweeps diagonally across the frame and the scene is
 * revealed behind it; on exit the blade sweeps back and uncovers the presenter.
 *
 * Backdrop: ink base, warm gold glow, slow-drifting hairline grid and a thin
 * scan line — the revoredo.pe line (gold #FAA726 on near-black), never a box.
 */
const IN = 14;
const OUT = 12;

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cell = width / 9;
  const drift = (frame * 0.6) % cell;
  const scanY = interpolate(frame % 90, [0, 90], [-0.1, 1.1]) * height;
  return (
    <AbsoluteFill style={{ background: colors.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 45% at 50% 42%, rgba(250,167,38,0.22) 0%, rgba(250,167,38,0.07) 45%, rgba(17,18,20,0) 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(250,167,38,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(250,167,38,0.13) 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `0px ${drift}px`,
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 45%, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 45%, black 30%, transparent 85%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: scanY,
          height: 2,
          background: `linear-gradient(90deg, transparent, rgba(250,167,38,0.35), transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Diagonal wipe edge position (0 → 1 across the frame, with a 20 % slant). */
const wipe = (p: number) => {
  const x = p * 140 - 20; // %
  return `polygon(0% 0%, ${x + 20}% 0%, ${x}% 100%, 0% 100%)`;
};

export const MGScene: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const pin = interpolate(frame, [0, IN], [0, 1], { ...clamp, easing: easings.easeInOut });
  const pout = interpolate(frame, [durationInFrames - OUT, durationInFrames], [0, 1], { ...clamp, easing: easings.easeInOut });
  // entering: scene revealed left→right; leaving: covered again left→right
  const clip = pout > 0 ? `polygon(${pout * 140}% 0%, 100% 0%, 100% 100%, ${pout * 140 - 20}% 100%)` : wipe(pin);
  const edge = pout > 0 ? pout : pin;
  const bladeX = (edge * 1.4 - 0.2) * width;
  const showBlade = edge > 0 && edge < 1;
  const content = interpolate(frame, [IN * 0.6, IN + 6], [0.94, 1], { ...clamp, easing: easings.easeOut });
  const contentOpacity = interpolate(frame, [IN * 0.5, IN], [0, 1], clamp) * (1 - pout);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>
        <Backdrop />
        <AbsoluteFill style={{ opacity: contentOpacity, transform: `scale(${content * 1.3})`, transformOrigin: "50% 40%" }}>
          {/* Center the graphic in the middle band, clear of the captions (≈64 %). */}
          <ZoneContext.Provider value={{ top: 0.26, bottom: 0.54, band: "middle", tone: "light" }}>{children}</ZoneContext.Provider>
        </AbsoluteFill>
      </AbsoluteFill>
      {showBlade ? (
        <div
          style={{
            position: "absolute",
            top: "-10%",
            bottom: "-10%",
            left: bladeX,
            width: 10,
            background: `linear-gradient(180deg, ${colors.goldSoft}, ${colors.gold}, ${colors.goldDeep})`,
            boxShadow: `0 0 40px 12px rgba(250,167,38,0.45)`,
            transform: "rotate(11deg)",
            transformOrigin: "50% 50%",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
