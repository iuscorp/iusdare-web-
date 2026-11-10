import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { brand, colors, scaleFor } from "../../brand/tokens";
import { useVideoConfig } from "remotion";

/**
 * Revoredo power-bug.
 * If brand.logoSrc is set, the official file is used. Otherwise the mark is
 * drawn as SVG, matching the bug used in the reference reels: gold disc with a
 * white power glyph over a soft, fading toggle track.
 */
export const LogoMark: React.FC<{ size?: number; track?: boolean }> = ({
  size = 64,
  track = true,
}) => {
  if (brand.logoSrc) {
    return <Img src={staticFile(brand.logoSrc)} style={{ width: size, height: "auto" }} />;
  }
  const h = track ? size * 1.45 : size;
  return (
    <svg width={size} height={h} viewBox={`0 0 100 ${track ? 145 : 100}`}>
      <defs>
        <linearGradient id="rv-track" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.gold} stopOpacity={0.55} />
          <stop offset="100%" stopColor={colors.paper} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      {track ? <rect x="2" y="2" width="96" height="141" rx="48" fill="url(#rv-track)" /> : null}
      <circle cx="50" cy="50" r="46" fill={colors.gold} />
      <path
        d="M36 33 A24 24 0 1 0 64 33"
        fill="none"
        stroke={colors.white}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line x1="50" y1="24" x2="50" y2="50" stroke={colors.white} strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
};

/** Corner bug, always top-right inside the safe area, as in the reference. */
export const LogoBug: React.FC<{ opacity?: number }> = ({ opacity = 0.92 }) => {
  const { width } = useVideoConfig();
  const k = scaleFor(width);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 150 * k, right: 70 * k, opacity }}>
        <LogoMark size={72 * k} />
      </div>
    </AbsoluteFill>
  );
};
