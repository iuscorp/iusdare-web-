import {interpolate, spring} from 'remotion';

/** Pop de entrada estándar de stickers/tarjetas [REF]: escala 0.5→1 en ~4 frames con leve rebote. */
export const popIn = (frame: number, fps: number) =>
  spring({frame, fps, config: {damping: 11, stiffness: 320, mass: 0.5}, durationInFrames: 7});

/** Flotación sutil mientras el elemento está en pantalla [REF: stickers "respiran"]. */
export const bob = (frame: number, amp = 6, period = 40) => Math.sin((frame / period) * Math.PI * 2) * amp;

/** Salida: las referencias usan corte seco. Se ofrece fade de 3 frames opcional. */
export const fadeOut = (frame: number, duration: number, frames = 3) =>
  interpolate(frame, [duration - frames, duration], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const emojiFile = (emoji: string) =>
  `stickers/${Array.from(emoji)
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join("-")}.png`;
