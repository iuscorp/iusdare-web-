import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';
import {popIn} from './anim';

/**
 * Título de revelación [REF: "Eso es / ilegal" en serif amarilla con glow, a la altura del pecho]:
 * cada línea aparece por corte seco al ritmo de la voz (≈ 1 línea cada 5–6 frames), la última
 * más grande. Es el veredicto: máximo 1 por video, siempre en la revelación.
 */
export const RevealTitle: React.FC<{lines: string[]; stepFrames?: number; x?: number; y?: number}> = ({
  lines,
  stepFrames = 6,
  x = 0.38,
  y = 0.6,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const visible = Math.min(lines.length, Math.floor(frame / stepFrames) + 1);
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        fontFamily: FONTS.reveal,
        fontWeight: 900,
        color: COLORS.captionYellow,
        lineHeight: 0.86,
        textShadow: `0 0 12px ${COLORS.captionGlow}, 0 0 30px rgba(255,214,0,0.55), 0 4px 6px ${COLORS.captionShadow}`,
      }}
    >
      {lines.slice(0, visible).map((l, i) => (
        <div key={i} style={{fontSize: i === lines.length - 1 ? 200 : 140, transform: 'scaleX(0.7)', whiteSpace: 'nowrap'}}>
          {l}
        </div>
      ))}
    </div>
  );
};

/**
 * Palabra cinética por sílabas [REF: "De / nun / ciar" apilado, amarillo, Druk Wide]:
 * cada sílaba entra al ritmo de la pronunciación. Pattern interrupt tipográfico para la
 * palabra-acción del video (denunciar, reclamar, exigir). Oculta el subtítulo mientras dura.
 */
export const KineticWord: React.FC<{syllables: string[]; stepFrames?: number; x?: number; y?: number}> = ({
  syllables,
  stepFrames = 5,
  x = 0.5,
  y = 0.2,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: x * width, top: y * height, transform: 'translate(-50%, -18%)', textAlign: 'center'}}>
      {syllables.map((s, i) => {
        const p = popIn(frame - i * stepFrames, fps);
        if (frame < i * stepFrames) return null;
        return (
          <div
            key={i}
            style={{
              fontFamily: FONTS.wide,
              fontStretch: '125%',
              fontWeight: 900,
              fontSize: i === 0 ? 250 : 190,
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              textTransform: 'none',
              color: COLORS.captionYellow,
              transform: `scale(${interpolate(p, [0, 1], [1.5, 1])})`,
              opacity: interpolate(p, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'}),
            }}
          >
            {s}
          </div>
        );
      })}
    </div>
  );
};

/** Badge de dato [REF: "(+14)" amarillo, Poppins Bold con sombra]: edades, plazos, montos, porcentajes. */
export const TextBadge: React.FC<{text: string; x?: number; y?: number}> = ({text, x = 0.42, y = 0.66}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = popIn(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [0.4, 1])})`,
        fontFamily: FONTS.card,
        fontWeight: 700,
        fontSize: 116,
        letterSpacing: '-0.01em',
        color: COLORS.captionYellow,
        textShadow: '0 5px 0 rgba(0,0,0,0.55), 0 0 18px rgba(255,214,0,0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};
