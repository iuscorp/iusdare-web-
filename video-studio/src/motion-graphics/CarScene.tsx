import React from 'react';
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';
import {emojiFile} from './anim';

/**
 * Escena animada con emojis (motion graphics) para el hook «le prestaste el carro a tu primo…
 * y te llegó una multa»: le das la llave al primo → se sube → el carro avanza por la pista →
 * pasa frente a la cámara → ¡flash! → sale la papeleta. Segunda parte (opcional): la cámara
 * «detecta la infracción» y vuelve a disparar.
 * Tiempos en segundos relativos al inicio del recurso.
 */
export type CarSceneTimes = {key?: number; board?: number; drive?: number; flash?: number; replay?: number; flash2?: number; weeks?: [number, number]};

const W = 900;
const H = 560;
const ROAD_Y = 430;

const Paper: React.FC<{w: number}> = ({w}) => (
  <div
    style={{
      width: w,
      height: w * 1.25,
      background: '#FFFDF5',
      borderRadius: 10,
      boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      fontFamily: FONTS.card,
    }}
  >
    <div style={{background: COLORS.deny, color: '#fff', fontWeight: 800, fontSize: w * 0.2, textAlign: 'center', padding: `${w * 0.05}px 0`}}>MULTA</div>
    {[0.62, 0.8, 0.5, 0.7, 0.4].map((k, i) => (
      <div key={i} style={{height: w * 0.045, width: `${k * 80}%`, background: '#CFCFCF', borderRadius: 4, margin: `${w * 0.075}px ${w * 0.1}px 0`}} />
    ))}
    <div style={{margin: `${w * 0.08}px ${w * 0.1}px 0`, width: w * 0.32, height: w * 0.22, border: `3px solid ${COLORS.deny}`, borderRadius: 6}} />
  </div>
);

export const CarScene: React.FC<{times?: CarSceneTimes; x?: number; y?: number; scale?: number}> = ({times = {}, x = 0.47, y = 0.62, scale = 0.95}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const T = {key: 0.2, board: 0.9, drive: 1.4, flash: 2.9, ...times};
  const ease = Easing.inOut(Easing.cubic);
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const appear = spring({frame, fps, config: {damping: 14, stiffness: 200}, durationInFrames: 10});

  // carro: estacionado → avanza hasta la cámara → frena (y en la repetición entra de nuevo)
  let carX = 140;
  if (T.replay !== undefined && t >= T.replay) {
    carX = interpolate(t, [T.replay, (T.flash2 ?? T.replay + 1.4) + 0.1], [-160, 560], {...clamp, easing: Easing.out(Easing.cubic)});
  } else carX = interpolate(t, [T.drive, T.flash], [140, 560], {...clamp, easing: ease});
  const moving = (t > T.drive && t < T.flash) || (T.replay !== undefined && t > T.replay && t < (T.flash2 ?? 99));
  const bump = moving ? Math.sin(frame * 1.7) * 3 : 0;
  const brake = interpolate(t, [T.flash, T.flash + 0.12, T.flash + 0.35], [0, -6, 0], clamp);

  // primo: de pie junto al carro → recibe la llave → se sube (va sentado sobre el carro)
  const boardP = interpolate(t, [T.board, T.board + 0.4], [0, 1], {...clamp, easing: ease});
  const primoX = interpolate(boardP, [0, 1], [330, carX + 10]);
  const primoY = interpolate(boardP, [0, 1], [ROAD_Y - 150, ROAD_Y - 215]);
  const primoS = interpolate(boardP, [0, 1], [1, 0.55]);

  // llave: de ti (arriba a la izquierda) al primo
  const keyP = interpolate(t, [T.key, T.key + 0.55], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const keyX = interpolate(keyP, [0, 1], [-40, 300]);
  const keyY = interpolate(keyP, [0, 1], [60, ROAD_Y - 230]) - Math.sin(keyP * Math.PI) * 120;
  const keyVis = t < T.board + 0.2 ? 1 : 0;

  // líneas de la pista que corren mientras el carro avanza
  const dash = (frame * (moving ? 18 : 0)) % 80;

  // cámara y destellos
  const flashes = [T.flash, T.flash2].filter((v): v is number => v !== undefined);
  const burst = Math.max(0, ...flashes.map((f) => interpolate(t, [f, f + 0.06, f + 0.4], [0, 1, 0], clamp)));
  const camFocus = T.replay !== undefined ? interpolate(t, [T.replay, T.replay + 0.4], [1, 1.35], {...clamp, easing: ease}) : 1;

  // papeleta: sale de la cámara y vuela al centro; se va al empezar la repetición
  const tickIn = spring({frame: frame - Math.round((T.flash + 0.08) * fps), fps, config: {damping: 13, stiffness: 160}, durationInFrames: 16});
  const tickOut = T.replay !== undefined ? interpolate(t, [T.replay - 0.15, T.replay + 0.2], [0, 1], clamp) : 0;
  const tickX = interpolate(tickIn, [0, 1], [770, 360]);
  const tickY = interpolate(tickIn, [0, 1], [120, 40]) - tickOut * 160;
  const tickS = interpolate(tickIn, [0, 1], [0.2, 1]);

  // etiqueta «2 semanas después»
  const wk = T.weeks ? interpolate(t, [T.weeks[0], T.weeks[0] + 0.15, T.weeks[1] - 0.15, T.weeks[1]], [0, 1, 1, 0], clamp) : 0;

  const em = (e: string, size: number, style: React.CSSProperties) => (
    <Img src={staticFile(emojiFile(e))} style={{position: 'absolute', width: size, height: size, ...style}} />
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: x * width,
        top: y * height,
        width: W,
        height: H,
        transform: `translate(-50%, -50%) scale(${scale * interpolate(appear, [0, 1], [0.8, 1])})`,
        opacity: appear,
      }}
    >
      {/* pista */}
      <div style={{position: 'absolute', left: 0, right: 0, top: ROAD_Y, height: 96, borderRadius: 26, background: '#3A3D44', boxShadow: '0 10px 24px rgba(0,0,0,0.35)', overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: -80 + -dash,
            right: -80,
            top: 44,
            height: 8,
            backgroundImage: 'repeating-linear-gradient(90deg, #F4F4F4 0 44px, transparent 44px 80px)',
          }}
        />
      </div>
      {/* poste + cámara */}
      <div style={{position: 'absolute', left: 776, top: 150, width: 14, height: ROAD_Y - 150, background: '#9AA3AD', borderRadius: 6}} />
      <div style={{position: 'absolute', left: 783, top: 150, transform: `translate(-50%, -50%) scale(${camFocus})`, transformOrigin: 'center'}}>
        {em('📹', 150, {left: -75, top: -75, transform: 'scaleX(-1)'})}
        <div
          style={{
            position: 'absolute',
            left: -140,
            top: -140,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,250,200,0.6) 35%, transparent 70%)',
            opacity: burst,
            transform: `scale(${0.6 + burst})`,
          }}
        />
      </div>
      {/* carro (mira a la derecha) */}
      {em('🚗', 250, {left: carX - 125, top: ROAD_Y - 185 + bump, transform: `scaleX(-1) rotate(${brake}deg)`})}
      {/* primo */}
      {em('👦', 140 * primoS, {left: primoX - 60 * primoS, top: primoY + (boardP >= 1 ? bump : 0)})}
      {/* llave */}
      {keyVis ? em('🔑', 90, {left: keyX - 45, top: keyY - 45, transform: `rotate(${keyP * 360}deg)`, opacity: keyP > 0 ? 1 : 0}) : null}
      {/* papeleta */}
      {t >= T.flash ? (
        <div style={{position: 'absolute', left: tickX, top: tickY, opacity: 1 - tickOut, transform: `translate(-50%, 0) rotate(${interpolate(tickIn, [0, 1], [30, -8])}deg) scale(${tickS})`}}>
          <Paper w={220} />
        </div>
      ) : null}
      {/* etiqueta de tiempo */}
      {wk > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: W / 2,
            top: 10,
            transform: `translateX(-50%) scale(${0.8 + wk * 0.2})`,
            opacity: wk,
            background: 'rgba(18,18,18,0.75)',
            color: COLORS.captionYellow,
            fontFamily: FONTS.card,
            fontWeight: 800,
            fontSize: 46,
            padding: '8px 26px',
            borderRadius: 40,
            whiteSpace: 'nowrap',
          }}
        >
          2 semanas después…
        </div>
      ) : null}
    </div>
  );
};
