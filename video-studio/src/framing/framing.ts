import {Easing, interpolate, spring} from 'remotion';
import {FRAMING} from '../brand/tokens';
import type {Framing, Segment} from '../lib/schema';

export type Transform = {scale: number; x: number; y: number};

export const resolveFraming = (f: Framing): Transform => {
  if (typeof f === 'string') {
    const p = FRAMING[f] as Partial<Transform>;
    return {scale: p.scale ?? 1, x: p.x ?? 0, y: p.y ?? 0};
  }
  return {scale: f.scale, x: f.x ?? 0, y: f.y ?? 0};
};

/**
 * Transform del plano en un frame local del segmento.
 *  - none:     encuadre fijo (jump cut con cambio de escala = estándar de las referencias)
 *  - crash:    crash zoom desde el plano base hasta el encuadre en ~6 frames (sorpresa / hook)
 *  - slowPush: empuje lento +4% a lo largo del segmento (build-up)
 *  - settle:   entra 6% más cerrado y se asienta (énfasis suave tras un corte)
 *  - snap:     corte con golpe de zoom (entra 8% más cerrado, cae en 4 frames) y sigue empujando +3% (ritmo/retención)
 */
export const segmentTransform = (seg: Segment, frame: number, durationInFrames: number, fps: number): Transform => {
  const target = resolveFraming(seg.framing);
  switch (seg.move) {
    case 'crash': {
      const p = spring({frame, fps, config: {damping: 18, stiffness: 260, mass: 0.6}, durationInFrames: 8});
      return {
        scale: interpolate(p, [0, 1], [1, target.scale]),
        x: interpolate(p, [0, 1], [0, target.x]),
        y: interpolate(p, [0, 1], [0, target.y]),
      };
    }
    case 'slowPush': {
      const t = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.quad),
      });
      return {...target, scale: target.scale * (1 + 0.04 * t)};
    }
    case 'settle': {
      const p = spring({frame, fps, config: {damping: 200}, durationInFrames: 10});
      return {...target, scale: target.scale * interpolate(p, [0, 1], [1.06, 1])};
    }
    case 'snap': {
      const p = spring({frame, fps, config: {damping: 16, stiffness: 420, mass: 0.5}, durationInFrames: 5});
      const t = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {extrapolateRight: 'clamp'});
      return {...target, scale: target.scale * interpolate(p, [0, 1], [1.08, 1]) * (1 + 0.03 * t)};
    }
    default:
      return target;
  }
};

/** Convierte el transform a CSS. x/y son fracciones del cuadro; el origen está en el rostro (~32% alto). */
export const transformCss = (t: Transform) => ({
  transform: `translate(${t.x * 100}%, ${t.y * 100}%) scale(${t.scale})`,
  transformOrigin: '50% 32%',
});
