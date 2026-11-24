import React from 'react';
import {interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';

/**
 * «GREENWASHING»: el texto aparece en amarillo y una brocha lo «pinta» de verde… mal:
 * pasadas irregulares, con huecos y chorreones (la metáfora del greenwashing).
 */
export const BrushPaint: React.FC<{lines: string[]; x?: number; y?: number; paintDelay?: number; paintFrames?: number}> = ({
  lines,
  x = 0.5,
  y = 0.6,
  paintDelay = 6,
  paintFrames = 26,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const W = 1000;
  const longest = Math.max(...lines.map((l) => l.length));
  // texto dentro del margen: ≤ 80 % del ancho
  const fs = Math.min(190, (W * 0.8) / (longest * 0.78));
  const lh = fs * 0.95;
  const H = lh * lines.length + 60;
  const pop = spring({frame, fps, config: {damping: 12, stiffness: 240}, durationInFrames: 8});
  // pasadas de brocha (zig-zag) sobre cada línea, con temblor
  const pts: Array<[number, number]> = [];
  lines.forEach((_, li) => {
    const cy = 30 + lh * li + lh * 0.5;
    const passes = [cy - fs * 0.22, cy + fs * 0.12];
    passes.forEach((py, pi) => {
      const xs = [70, 930];
      if ((li * 2 + pi) % 2 === 1) xs.reverse();
      for (let k = 0; k <= 12; k++) {
        const px = xs[0] + ((xs[1] - xs[0]) * k) / 12;
        pts.push([px, py + (random(`w${li}${pi}${k}`) - 0.5) * fs * 0.28]);
      }
    });
  });
  const prog = interpolate(frame, [paintDelay, paintDelay + paintFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const n = Math.max(1, Math.floor(prog * (pts.length - 1)));
  const drawn = pts.slice(0, n + 1);
  const d = drawn.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const tip = drawn[drawn.length - 1];
  // chorreones que aparecen detrás de la brocha
  const drips = pts
    .filter((_, i) => i < n && i % 5 === 2)
    .map((p, i) => ({x: p[0], y: p[1] + fs * 0.25, len: fs * (0.25 + random(`d${i}`) * 0.45)}));
  const done = frame > paintDelay + paintFrames + 4;
  const brushOut = interpolate(frame, [paintDelay + paintFrames, paintDelay + paintFrames + 8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = (width * 0.86) / W;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        width: W,
        height: H,
        transform: `translate(-50%, -50%) scale(${scale * interpolate(pop, [0, 1], [0.6, 1])})`,
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'visible'}}>
        <defs>
          <mask id="paintMask">
            <path d={d} fill="none" stroke="white" strokeWidth={fs * 0.42} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${fs * 1.6} ${fs * 0.22}`} />
            {drips.map((dr, i) => (
              <path key={i} d={`M${dr.x} ${dr.y} l0 ${dr.len}`} stroke="white" strokeWidth={fs * 0.07} strokeLinecap="round" />
            ))}
          </mask>
          <filter id="glowY" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="3" floodColor="rgba(0,0,0,0.35)" />
          </filter>
        </defs>
        {lines.map((l, i) => (
          <text
            key={`y${i}`}
            x={W / 2}
            y={30 + lh * i + lh * 0.82}
            textAnchor="middle"
            fontFamily={FONTS.wide}
            fontWeight={900}
            fontSize={fs}
            fill={COLORS.captionYellow}
            filter="url(#glowY)"
          >
            {l}
          </text>
        ))}
        {/* pintura verde: sólo dentro de las letras y donde pasó la brocha */}
        <g mask="url(#paintMask)">
          {lines.map((l, i) => (
            <text key={`g${i}`} x={W / 2} y={30 + lh * i + lh * 0.82} textAnchor="middle" fontFamily={FONTS.wide} fontWeight={900} fontSize={fs} fill="#2DB34A">
              {l}
            </text>
          ))}
        </g>
        {/* manchas de pintura que se salen de las letras (pinta mal) */}
        <g mask="url(#paintMask)" opacity={0.55}>
          {drips.map((dr, i) => (
            <circle key={i} cx={dr.x + 6} cy={dr.y + dr.len} r={fs * 0.06} fill="#2DB34A" />
          ))}
        </g>
        {/* brocha */}
        {!done || brushOut > 0 ? (
          <g transform={`translate(${tip[0]} ${tip[1]}) rotate(-35)`} opacity={brushOut}>
            <rect x={-fs * 0.2} y={-fs * 0.18} width={fs * 0.4} height={fs * 0.28} rx={fs * 0.05} fill="#2DB34A" />
            <rect x={-fs * 0.22} y={-fs * 0.42} width={fs * 0.44} height={fs * 0.26} rx={fs * 0.03} fill="#B0BEC5" stroke="#78909C" strokeWidth={3} />
            <rect x={-fs * 0.09} y={-fs * 1.25} width={fs * 0.18} height={fs * 0.85} rx={fs * 0.08} fill="#8D5A2B" />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

/** Sello de goma rojo «tipo CANCELLED»: rectángulo con doble borde, rotado, textura gastada. */
export const RubberStamp: React.FC<{lines: string[]; x?: number; y?: number; rotate?: number}> = ({lines, x = 0.5, y = 0.62, rotate = -8}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 11, stiffness: 320}, durationInFrames: 8});
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = Math.min(84, (width * 0.68) / (longest * 0.66));
  const red = '#D7263D';
  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${interpolate(p, [0, 1], [2.4, 1])})`,
        opacity: interpolate(p, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'}),
        border: `${fs * 0.1}px solid ${red}`,
        outline: `${fs * 0.05}px solid ${red}`,
        outlineOffset: `${fs * 0.08}px`,
        borderRadius: fs * 0.12,
        padding: `${fs * 0.18}px ${fs * 0.4}px`,
        color: red,
        fontFamily: FONTS.wide,
        fontWeight: 900,
        fontSize: fs,
        lineHeight: 1.02,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        background: 'rgba(255,255,255,0.08)',
        // textura de tinta gastada
        WebkitMaskImage:
          'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.55) 0 6%, black 7%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.6) 0 5%, black 6%), repeating-linear-gradient(115deg, black 0 9px, rgba(0,0,0,0.82) 9px 12px)',
        WebkitMaskComposite: 'source-in',
        maskComposite: 'intersect',
        filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.25))',
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
};

/** Letrero LED (matriz de puntos naranja con brillo) para la pregunta-reto. */
export const LedSign: React.FC<{text: string; y?: number; durationInFrames: number}> = ({text, y = 0.2, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const panelW = width * 0.9;
  const panelH = height * 0.085;
  const fs = Math.min(panelH * 0.62, (panelW * 0.92) / (text.length * 0.78));
  // encendido con parpadeo y letras que se encienden una a una
  const on = frame < 3 ? (frame % 2 ? 0.3 : 1) : 1;
  const lit = Math.min(text.length, Math.floor(frame * 1.6));
  const fade = interpolate(frame, [durationInFrames - 4, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const led = '#FFB21E';
  return (
    <div
      style={{
        position: 'absolute',
        left: (width - panelW) / 2,
        top: y * height - panelH / 2,
        width: panelW,
        height: panelH,
        borderRadius: panelH * 0.14,
        background: '#0B0B0D',
        backgroundImage: 'radial-gradient(circle, rgba(255,178,30,0.10) 32%, transparent 36%)',
        backgroundSize: '9px 9px',
        boxShadow: '0 0 0 6px #23232A, 0 14px 30px rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: on * fade,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.wide,
          fontWeight: 900,
          fontSize: fs,
          letterSpacing: '0.06em',
          color: led,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          WebkitMaskImage: 'radial-gradient(circle, black 48%, transparent 54%)',
          WebkitMaskSize: '9px 9px',
          filter: `drop-shadow(0 0 4px ${led}) drop-shadow(0 0 10px rgba(255,140,0,0.75))`,
        }}
      >
        {text.split('').map((c, i) => (
          <span key={i} style={{opacity: i < lit ? 1 : 0.08}}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
};
