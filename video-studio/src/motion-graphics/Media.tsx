import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';
import {bob, popIn} from './anim';

const src = (p: string) => (/^https?:\/\//.test(p) ? p : staticFile(p));

const glowLabel: React.CSSProperties = {
  fontFamily: FONTS.caption,
  fontWeight: 800,
  fontStyle: 'normal',
  color: COLORS.captionYellow,
  textShadow: `0 0 10px ${COLORS.captionGlow}, 0 0 22px ${COLORS.captionGlow}, 0 3px 4px ${COLORS.captionShadow}`,
  textAlign: 'center',
  lineHeight: 0.95,
};

/**
 * Portada de documento/código legal [REF: "Código de Protección al consumidor", "Código Penal"]:
 * portada inclinada con sombra, pop de entrada y etiqueta amarilla con glow debajo.
 */
export const DocumentCover: React.FC<{image: string; label?: string; x?: number; y?: number}> = ({image, label, x = 0.2, y = 0.62}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = popIn(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height + bob(frame, 4, 50),
        transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [0.5, 1])}) rotate(-3deg)`,
        width: 260,
      }}
    >
      <Img src={src(image)} style={{width: 260, borderRadius: 6, boxShadow: '0 18px 30px rgba(0,0,0,0.35)'}} />
      {label ? <div style={{...glowLabel, fontSize: 42, marginTop: 10}}>{label}</div> : null}
    </div>
  );
};

/** Logo institucional [REF: Indecopi arriba-derecha]: aparece con fade+escala, sin caja. */
export const LogoBadge: React.FC<{image: string; label?: string; x?: number; y?: number}> = ({image, label, x = 0.8, y = 0.15}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = popIn(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [0.7, 1])})`,
        opacity: p,
        textAlign: 'center',
      }}
    >
      <Img src={src(image)} style={{height: 150, objectFit: 'contain'}} />
      {label ? <div style={{fontFamily: FONTS.card, fontSize: 44, color: '#7a7a7a', fontWeight: 600}}>{label}</div> : null}
    </div>
  );
};

/** Foto de apoyo tipo "recorte" [REF: fotos de ejemplo con borde blanco al costado]. */
export const PhotoCard: React.FC<{image: string; rotate?: number; x?: number; y?: number}> = ({image, rotate = -4, x = 0.72, y = 0.66}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = popIn(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [0.4, 1])}) rotate(${rotate}deg)`,
        background: 'white',
        padding: 8,
        boxShadow: '0 14px 28px rgba(0,0,0,0.35)',
      }}
    >
      <Img src={src(image)} style={{width: 300, height: 380, objectFit: 'cover', display: 'block'}} />
    </div>
  );
};

/**
 * Imagen de contexto en el fondo [REF: foto de ejemplo ocupando la pared, detrás del presentador].
 * Se coloca en la franja superior con degradado hacia la pared. Si se dispone de un matte
 * del presentador (p. ej. exportado con remove-bg), pasarlo en el EDL permitirá dejarlo delante;
 * sin matte, la franja se limita a la zona de pared para no cubrir el rostro.
 */
export const BackgroundPlate: React.FC<{image: string}> = ({image}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 5], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Img
        src={src(image)}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '30%',
          objectFit: 'cover',
          WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Letra/palabra gigante amarilla en Druk Wide [REF: "De…" de "denunciar"]: pattern interrupt tipográfico. */
export const BigLetter: React.FC<{text: string; x?: number; y?: number}> = ({text, x = 0.5, y = 0.2}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = popIn(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [1.6, 1])})`,
        fontFamily: FONTS.wide,
        fontStretch: '125%',
        fontWeight: 900,
        fontSize: 260,
        letterSpacing: '-0.02em',
        color: COLORS.captionYellow,
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};

/**
 * Aspa roja de negación [REF: ✖ rojo que entra desde la izquierda, se detiene junto al
 * presentador al decir "no…" y sale por la derecha]. Entrada 4 frames, salida 4 frames.
 */
export const DenyMark: React.FC<{x?: number; y?: number; size?: number; durationInFrames?: number}> = ({x = 0.3, y = 0.62, size = 170, durationInFrames = 30}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const enter = interpolate(frame, [0, 4], [-0.35, 0], {extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [durationInFrames - 4, durationInFrames], [0, 0.8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dx = (enter + exit) * width;
  const rot = interpolate(frame, [0, 4], [-60, 0], {extrapolateRight: 'clamp'});
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{position: 'absolute', left: x * width - size / 2 + dx, top: y * height - size / 2, transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.3))'}}
    >
      <line x1={14} y1={14} x2={106} y2={106} stroke={COLORS.deny} strokeWidth={24} strokeLinecap="round" />
      <line x1={106} y1={14} x2={14} y2={106} stroke={COLORS.deny} strokeWidth={24} strokeLinecap="round" />
    </svg>
  );
};
