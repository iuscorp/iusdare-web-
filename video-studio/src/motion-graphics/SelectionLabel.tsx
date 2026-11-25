import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';

/**
 * Etiqueta "seleccionada en el editor" [REF: "Ley del servicio civil", "Inmediatez Temporal"]:
 * un cursor de ratón entra, el texto aparece dentro de una caja de selección azul con
 * tiradores, y al final la caja desaparece dejando el texto limpio (código nativo: rompe
 * la cuarta pared mostrando "la edición", genera novedad visual).
 * Función: fijar un concepto técnico/término jurídico como "etiqueta" memorable.
 */
export const SelectionLabel: React.FC<{text: string; cursor?: boolean; x?: number; y?: number; durationInFrames: number}> = ({
  text,
  cursor = true,
  x = 0.5,
  y = 0.66,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const lines = text.split('\n').length > 1 ? text.split('\n') : splitTwo(text);
  const selectEnd = Math.min(durationInFrames * 0.6, 24);
  const boxOpacity = interpolate(frame, [selectEnd, selectEnd + 3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cursorT = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const textIn = interpolate(frame, [2, 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fontSize = 78;
  return (
    <div style={{position: 'absolute', left: x * width, top: y * height, transform: 'translate(-50%, -50%)'}}>
      <div
        style={{
          position: 'relative',
          padding: '8px 14px',
          background: boxOpacity > 0 ? COLORS.selectionFill.replace(/[\d.]+\)$/, `${0.78 * boxOpacity})`) : 'transparent',
          outline: boxOpacity > 0 ? `3px solid rgba(76,123,242,${boxOpacity})` : 'none',
          fontFamily: FONTS.card,
          fontWeight: 600,
          fontSize,
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: COLORS.cardText,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          opacity: textIn,
          textShadow: boxOpacity < 1 ? `0 4px 0 rgba(0,0,0,${0.5 * (1 - boxOpacity)})` : 'none',
        }}
      >
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
        {boxOpacity > 0 ? (
          <>
            <Handle style={{left: -11, top: -11}} o={boxOpacity} />
            <Handle style={{right: -11, bottom: -11}} o={boxOpacity} />
          </>
        ) : null}
      </div>
      {cursor && boxOpacity > 0 ? (
        <svg
          width={64}
          height={80}
          viewBox="0 0 16 20"
          style={{
            position: 'absolute',
            right: interpolate(cursorT, [0, 1], [-220, -10]),
            bottom: interpolate(cursorT, [0, 1], [-180, -30]),
            opacity: boxOpacity,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))',
          }}
        >
          <path d="M1 1 L1 16 L5 12 L8 19 L11 18 L8 11 L14 11 Z" fill="#fff" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
};

const Handle: React.FC<{style: React.CSSProperties; o: number}> = ({style, o}) => (
  <div
    style={{
      position: 'absolute',
      width: 22,
      height: 22,
      borderRadius: 11,
      background: COLORS.selectionHandle,
      border: '3px solid white',
      opacity: o,
      ...style,
    }}
  />
);

const splitTwo = (t: string) => {
  const words = t.split(' ');
  if (words.length < 2 || t.length < 14) return [t];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
};
