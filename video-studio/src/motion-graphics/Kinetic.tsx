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
type KineticProps = {syllables: string[]; stepFrames?: number; x?: number; y?: number; layout?: 'stack' | 'rows' | 'line'; uppercase?: boolean};

export const KineticWord: React.FC<KineticProps> = (props) =>
  props.layout === 'rows' ? <KineticRows {...props} /> : props.layout === 'line' ? <KineticLine {...props} /> : <KineticStack {...props} />;

/**
 * Variante en UNA línea a todo el ancho ("VOLUNTARIO"): la palabra se arma sílaba a sílaba,
 * delante del presentador, ajustando el tamaño al ancho del cuadro (máx. 96 %).
 */
const KineticLine: React.FC<KineticProps> = ({syllables, stepFrames = 3, y = 0.56, uppercase = true}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const text = syllables.join('');
  const chars = text.length;
  // Archivo Expanded en mayúsculas ≈ 0.84 em por carácter (medido); Druk Wide es más ancha: revisar si se instala
  const fontSize = Math.min(320, (width * 0.96) / (chars * (uppercase ? 0.84 : 0.8)));
  const whole = popIn(frame, fps);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y * height,
        transform: `translateY(-50%) scale(${interpolate(whole, [0, 1], [1.15, 1])})`,
        textAlign: 'center',
        fontFamily: FONTS.wide,
        fontStretch: '125%',
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        color: COLORS.captionYellow,
        whiteSpace: 'nowrap',
        textShadow: '0 6px 0 rgba(0,0,0,0.35), 0 10px 26px rgba(0,0,0,0.35)',
      }}
    >
      {syllables.map((syl, i) => (
        <span key={i} style={{opacity: frame >= i * stepFrames ? 1 : 0}}>
          {uppercase ? syl.toLocaleUpperCase('es') : syl}
        </span>
      ))}
    </div>
  );
};

/**
 * Variante en 2 filas: la palabra se arma sílaba a sílaba en dos líneas grandes que ocupan el
 * ancho del cuadro. Pensada para ir DETRÁS de la persona: la cabeza tapa sólo la base de la
 * segunda fila y la palabra sigue leyéndose.
 */
const KineticRows: React.FC<{syllables: string[]; stepFrames?: number; y?: number}> = ({syllables, stepFrames = 4, y = 0.05}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const mid = Math.ceil(syllables.length / 2);
  const rows = [syllables.slice(0, mid), syllables.slice(mid)];
  const longest = Math.max(...rows.map((r) => r.join('').length));
  // Druk Wide / Archivo Expanded ≈ 0.95 em por carácter
  const fontSize = Math.min(300, (width * 0.94) / (longest * 0.95));
  let idx = 0;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y * height, textAlign: 'center'}}>
      {rows.map((r, ri) => (
        <div key={ri} style={{fontFamily: FONTS.wide, fontStretch: '125%', fontWeight: 900, fontSize, lineHeight: 0.92, letterSpacing: '-0.02em', color: COLORS.captionYellow, whiteSpace: 'nowrap'}}>
          {r.map((syl) => {
            const i = idx++;
            if (frame < i * stepFrames) return null;
            const p = popIn(frame - i * stepFrames, fps);
            return (
              <span key={i} style={{display: 'inline-block', transform: `scale(${interpolate(p, [0, 1], [1.4, 1])})`, opacity: interpolate(p, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'})}}>
                {syl}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const KineticStack: React.FC<{syllables: string[]; stepFrames?: number; x?: number; y?: number}> = ({
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
