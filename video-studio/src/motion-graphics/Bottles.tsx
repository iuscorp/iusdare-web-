import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';

/**
 * Tres botellas genéricas (sin marca) dibujadas en vector — hook visual de «¿cuál es ecológica?».
 *  1: verde con hojas, «amigable con el planeta» (afirmación vaga)
 *  2: sello verde «ECO» inventado por la marca
 *  3: «50 % plástico reciclado» (afirmación específica y comprobable)
 * focus = botella destacada (las demás se atenúan); marks = ✗ / ✓ sobre cada botella.
 */
export type BottleMark = 'x' | 'check' | null;

const BODY = ['#3FA34D', '#9FD3E6', '#CFE7F1'];
const CAP = ['#2E7D32', '#1E88E5', '#78909C'];

const Bottle: React.FC<{i: number; w: number}> = ({i, w}) => {
  const h = w * 2.5;
  return (
    <svg width={w} height={h} viewBox="0 0 120 300" style={{overflow: 'visible', filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.35))'}}>
      {/* tapa */}
      <rect x="44" y="4" width="32" height="22" rx="5" fill={CAP[i]} />
      <rect x="42" y="24" width="36" height="6" rx="2" fill={CAP[i]} opacity="0.85" />
      {/* cuello + hombros + cuerpo */}
      <path
        d="M48 30 L72 30 L74 52 C100 66 108 84 108 108 L108 278 C108 290 100 296 90 296 L30 296 C20 296 12 290 12 278 L12 108 C12 84 20 66 46 52 Z"
        fill={BODY[i]}
        opacity={i === 0 ? 0.95 : 0.82}
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2"
      />
      {/* brillo */}
      <path d="M24 110 L24 270" stroke="rgba(255,255,255,0.6)" strokeWidth="7" strokeLinecap="round" />
      {/* aros del cuerpo */}
      <path d="M12 238 L108 238 M12 250 L108 250" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      {/* etiqueta */}
      <rect x="12" y="132" width="96" height="78" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
};

const Label: React.FC<{i: number; w: number}> = ({i, w}) => {
  const s = w / 120;
  const base: React.CSSProperties = {
    position: 'absolute',
    left: 12 * s,
    width: 96 * s,
    top: 132 * s * 1,
    height: 78 * s,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONTS.card,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.05,
    color: '#1B5E20',
  };
  if (i === 0)
    return (
      <div style={base}>
        <svg width={34 * s} height={30 * s} viewBox="0 0 34 30">
          <path d="M17 28 C17 18 12 10 3 6 C4 16 9 24 17 28 Z" fill="#43A047" />
          <path d="M17 28 C17 16 22 7 31 3 C31 15 26 24 17 28 Z" fill="#66BB6A" />
          <path d="M17 28 L17 14" stroke="#2E7D32" strokeWidth="1.6" />
        </svg>
        <div style={{fontSize: 11 * s}}>amigable con el planeta</div>
      </div>
    );
  if (i === 1)
    return (
      <div style={base}>
        <div
          style={{
            width: 58 * s,
            height: 58 * s,
            borderRadius: '50%',
            background: '#2E9E44',
            border: `${3 * s}px dashed #E8F5E9`,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15 * s,
          }}
        >
          ECO
          <span style={{fontSize: 13 * s}}>✓</span>
        </div>
      </div>
    );
  return (
    <div style={{...base, color: '#0D47A1'}}>
      <div style={{fontSize: 26 * s, letterSpacing: '-0.02em'}}>50%</div>
      <div style={{fontSize: 10.5 * s}}>plástico reciclado</div>
    </div>
  );
};

export const Bottles: React.FC<{
  show?: number[];
  focus?: number;
  marks?: BottleMark[];
  numbers?: boolean;
  w?: number;
  x?: number;
  y?: number;
}> = ({show = [0, 1, 2], focus, marks = [], numbers = true, w = 190, x = 0.5, y = 0.66}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const gap = w * 0.28;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'flex-end',
        gap,
      }}
    >
      {show.map((i, k) => {
        const p = spring({frame: frame - k * 3, fps, config: {damping: 12, stiffness: 220}, durationInFrames: 10});
        const focused = focus === undefined || focus === i;
        const scale = interpolate(p, [0, 1], [0.4, 1]) * (focus === i && show.length > 1 ? 1.12 : 1);
        const mark = marks[i];
        const mp = spring({frame: frame - 6, fps, config: {damping: 10, stiffness: 260}, durationInFrames: 8});
        return (
          <div
            key={i}
            style={{
              position: 'relative',
              transform: `scale(${scale}) rotate(${(k - (show.length - 1) / 2) * 3}deg)`,
              transformOrigin: 'bottom center',
              opacity: interpolate(p, [0, 1], [0, 1]) * (focused ? 1 : 0.38),
            }}
          >
            <Bottle i={i} w={w} />
            <Label i={i} w={w} />
            {numbers ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: -w * 0.34,
                  transform: 'translateX(-50%)',
                  fontFamily: FONTS.wide,
                  fontSize: w * 0.3,
                  color: COLORS.captionYellow,
                  textShadow: `0 0 10px ${COLORS.captionGlow}, 0 3px 4px ${COLORS.captionShadow}`,
                }}
              >
                {i + 1}
              </div>
            ) : null}
            {mark ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '38%',
                  transform: `translate(-50%, -50%) scale(${interpolate(mp, [0, 1], [2.2, 1])})`,
                  opacity: interpolate(mp, [0, 1], [0, 1]),
                  fontSize: w * 0.95,
                  fontWeight: 900,
                  fontFamily: FONTS.card,
                  color: mark === 'x' ? COLORS.deny : '#2ECC40',
                  textShadow: '0 4px 10px rgba(0,0,0,0.45)',
                  lineHeight: 1,
                }}
              >
                {mark === 'x' ? '✗' : '✓'}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
