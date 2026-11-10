import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';

/**
 * «Foto» de la norma impresa: hoja de papel con el texto literal del artículo y un resaltador
 * amarillo que se pasa sobre la frase clave mientras el presentador la dice.
 * Código nativo: prueba visual (Build Up) — el espectador VE la ley, no sólo la oye.
 * El texto entre ** ** se resalta; `highlightAt` (s desde la entrada, uno por frase) marca cada trazo.
 */
export const LawPage: React.FC<{
  source: string;
  heading: string;
  body: string;
  highlightAt?: number | number[];
  x?: number;
  y?: number;
  rotate?: number;
}> = ({source, heading, body, highlightAt = 0.35, x = 0.5, y = 0.6, rotate = -2.5}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 14, stiffness: 180, mass: 0.7}, durationInFrames: 12});
  const push = interpolate(frame, [0, fps * 4], [1, 1.05], {extrapolateRight: 'clamp'});
  const parts = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const hlFrames = Math.round(fps * 0.45);
  let hlIndex = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        width: 700,
        transform: `translate(-50%, -50%) translateY(${interpolate(enter, [0, 1], [380, 0])}px) rotate(${interpolate(enter, [0, 1], [8, rotate])}deg) scale(${push})`,
        opacity: interpolate(enter, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
        background: 'linear-gradient(160deg, #fffdf6 0%, #f6f1e3 60%, #efe8d6 100%)',
        borderRadius: 6,
        padding: '36px 42px 40px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.38), 0 4px 10px rgba(0,0,0,0.18), inset 0 0 60px rgba(160,140,90,0.12)',
        color: '#1d1b16',
      }}
    >
      <div style={{fontFamily: FONTS.card, fontWeight: 700, fontSize: 24, letterSpacing: 5, color: '#7b6d4f', textTransform: 'uppercase'}}>{source}</div>
      <div style={{height: 3, background: '#cbbd98', margin: '11px 0 17px'}} />
      <div style={{fontFamily: FONTS.serif, fontWeight: 700, fontSize: 40, lineHeight: 1.1, marginBottom: 16}}>{heading}</div>
      <div style={{fontFamily: FONTS.serif, fontWeight: 400, fontSize: 32, lineHeight: 1.42}}>
        {parts.map((p, i) => {
          if (!p.startsWith('**')) return <span key={i}>{p}</span>;
          const k = hlIndex++;
          const at = Array.isArray(highlightAt) ? (highlightAt[k] ?? highlightAt[highlightAt.length - 1] + 0.4 * k) : highlightAt + 0.36 * k;
          const start = Math.round(at * fps);
          const w = interpolate(frame, [start, start + hlFrames], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <span
              key={i}
              style={{
                fontWeight: 700,
                backgroundImage: `linear-gradient(100deg, ${COLORS.captionYellow}e6 0%, ${COLORS.captionYellow}cc 100%)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${w}% 78%`,
                backgroundPosition: '0 70%',
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
                padding: '0 4px',
              }}
            >
              {p.slice(2, -2)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
