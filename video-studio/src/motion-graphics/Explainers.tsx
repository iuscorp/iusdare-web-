import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';
import {emojiFile, popIn} from './anim';

/**
 * [REF] Ecuación de emojis ("⚙️ + ⏳ ∞ ?" = funciones permanentes): cada elemento entra
 * en secuencia, uno cada 5 frames. Traduce un requisito jurídico a una "fórmula" visual.
 * Elementos que no son emoji (+, =, ?, ∞) se dibujan como texto blanco.
 */
export const EmojiEquation: React.FC<{items: string[]; x?: number; y?: number}> = ({items, x = 0.4, y = 0.68}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: x * width, top: y * height, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 14}}>
      {items.map((it, i) => {
        const p = popIn(frame - i * 5, fps);
        const isSymbol = /^[+\-=?∞→×÷]+$/.test(it);
        return (
          <div key={i} style={{transform: `scale(${p})`, opacity: p > 0.01 ? 1 : 0}}>
            {isSymbol ? (
              <span style={{fontFamily: FONTS.card, fontWeight: 800, fontSize: 84, color: 'white', textShadow: '0 4px 0 rgba(0,0,0,0.45)'}}>{it}</span>
            ) : (
              <Img src={staticFile(emojiFile(it))} style={{width: 96, height: 96}} />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * [REC] Sello de veredicto ("ILEGAL" / "LEGAL"): refuerza la revelación principal.
 * Inspirado en el patrón verbal constante de las referencias ("…es ilegal") pero NO
 * observado como gráfico: usar como máximo 1 vez por video.
 */
export const VerdictStamp: React.FC<{text: string; tone?: 'deny' | 'ok'; x?: number; y?: number}> = ({text, tone = 'deny', x = 0.5, y = 0.7}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 9, stiffness: 260}, durationInFrames: 10});
  const color = tone === 'deny' ? COLORS.deny : COLORS.ok;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: `translate(-50%, -50%) rotate(-7deg) scale(${interpolate(p, [0, 1], [2.2, 1])})`,
        opacity: interpolate(p, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
        border: `10px solid ${color}`,
        borderRadius: 18,
        padding: '6px 34px',
        fontFamily: FONTS.card,
        fontWeight: 800,
        fontSize: 120,
        letterSpacing: '0.02em',
        color,
        background: 'rgba(255,255,255,0.85)',
      }}
    >
      {text}
    </div>
  );
};

/**
 * [REC] Lista de pasos ("¿Y qué hacer? Primero… ¿No lo resuelven?…") — patrón verbal [REF]
 * presente en las referencias. Cada paso aparece con su número; sin fondo de diapositiva,
 * tarjeta compacta semitransparente para no tapar al presentador.
 */
export const StepList: React.FC<{title?: string; steps: string[]; x?: number; y?: number; durationInFrames: number}> = ({
  title,
  steps,
  x = 0.5,
  y = 0.7,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const per = Math.max(8, Math.floor(durationInFrames / (steps.length + 1)));
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: 'translate(-50%, -50%)',
        width: width * 0.78,
        fontFamily: FONTS.card,
        color: COLORS.white,
      }}
    >
      {title ? <div style={{fontSize: 52, fontWeight: 800, marginBottom: 12, textShadow: '0 3px 0 rgba(0,0,0,0.5)'}}>{title}</div> : null}
      {steps.map((s, i) => {
        const p = popIn(frame - i * per, fps);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              margin: '10px 0',
              padding: '14px 20px',
              borderRadius: 18,
              background: 'rgba(18,18,18,0.62)',
              transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
              opacity: p,
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            <span style={{width: 58, height: 58, borderRadius: 29, background: COLORS.captionYellow, color: COLORS.ink, display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0}}>
              {i + 1}
            </span>
            <span>{s}</span>
          </div>
        );
      })}
    </div>
  );
};

/** [REC] Comparación A vs B (público vs privado, permitido vs prohibido). */
export const Comparison: React.FC<{
  left: {label: string; emoji?: string};
  right: {label: string; emoji?: string};
  y?: number;
}> = ({left, right, y = 0.68}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const side = (d: {label: string; emoji?: string}, i: number) => {
    const p = popIn(frame - i * 6, fps);
    return (
      <div style={{flex: 1, textAlign: 'center', transform: `scale(${p})`}}>
        {d.emoji ? <Img src={staticFile(emojiFile(d.emoji))} style={{width: 130, height: 130}} /> : null}
        <div style={{fontFamily: FONTS.card, fontWeight: 800, fontSize: 50, color: 'white', textShadow: '0 4px 0 rgba(0,0,0,0.5)'}}>{d.label}</div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: width * 0.06, right: width * 0.06, top: y * height, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center'}}>
      {side(left, 0)}
      <div style={{fontFamily: FONTS.caption, fontStyle: 'italic', fontWeight: 900, fontSize: 70, color: COLORS.captionYellow}}>vs</div>
      {side(right, 1)}
    </div>
  );
};
