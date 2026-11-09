import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';

/**
 * Tarjeta de norma [REF: "Ley 30057" / "Ley 29719 (Ley Antibullying)"]:
 *  - el número se "escribe" carácter a carácter con caret de texto parpadeante
 *  - grotesca bold grande, blanca (o amarilla) con sombra corta
 *  - subtítulo explicativo debajo en tamaño menor y nota al pie opcional
 * Función: anclar la afirmación en una fuente legal verificable sin leer la norma.
 */
export const LawCard: React.FC<{
  title: string;
  subtitle?: string;
  footnote?: string;
  color?: 'white' | 'yellow';
  x?: number;
  y?: number;
}> = ({title, subtitle, footnote, color = 'white', x = 0.42, y = 0.62}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const charsPerFrame = 0.9; // [REF] ~"Ley 300" en 7 frames
  const typed = Math.min(title.length, Math.floor(frame * charsPerFrame) + 1);
  const done = typed >= title.length;
  const caretOn = !done || Math.floor(frame / (fps / 4)) % 2 === 0;
  const subOpacity = interpolate(frame, [title.length / charsPerFrame, title.length / charsPerFrame + 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fill = color === 'yellow' ? COLORS.captionYellow : COLORS.white;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: 'translate(-50%, -50%)',
        fontFamily: FONTS.card,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          fontSize: 112,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: fill,
          textShadow: '0 5px 0 rgba(0,0,0,0.55), 0 8px 18px rgba(0,0,0,0.35)',
        }}
      >
        {title.slice(0, typed)}
        <span style={{opacity: caretOn ? 1 : 0, fontWeight: 300, marginLeft: 4}}>|</span>
      </div>
      {subtitle ? (
        <div
          style={{
            opacity: subOpacity,
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: COLORS.cardText,
            marginTop: -6,
            textShadow: '0 3px 0 rgba(0,0,0,0.5)',
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {footnote ? (
        <div style={{opacity: subOpacity, fontSize: 24, fontWeight: 600, color: COLORS.cardText, marginTop: 6}}>
          {footnote}
        </div>
      ) : null}
    </div>
  );
};
