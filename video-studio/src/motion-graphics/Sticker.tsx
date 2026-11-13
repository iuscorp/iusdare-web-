import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {bob, emojiFile, popIn} from './anim';

/**
 * Sticker emoji 3D [REF]: aparece con pop, flota levemente y sale por corte seco.
 * Posición por defecto: a la altura del pecho, al lado de la mano libre (x 0.5, y 0.62).
 * Función narrativa: traducir una emoción o un actor (policía, profesor, banco) en 1 imagen.
 * Assets: Microsoft Fluent Emoji 3D (MIT) → public/stickers (scripts/lib/assets.mjs).
 */
export const Sticker: React.FC<{emoji: string; size?: number; x?: number; y?: number}> = ({
  emoji,
  size = 170,
  x = 0.5,
  y = 0.62,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = popIn(frame, fps);
  const s = interpolate(p, [0, 1], [0.45, 1]);
  return (
    <Img
      src={staticFile(emojiFile(emoji))}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: x * width - size / 2,
        top: y * height - size / 2 + bob(frame),
        transform: `scale(${s}) rotate(${interpolate(p, [0, 1], [-12, 0])}deg)`,
        filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.28))',
      }}
    />
  );
};
