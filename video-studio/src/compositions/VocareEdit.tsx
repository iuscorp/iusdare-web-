import React from 'react';
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  OffthreadVideo,
  Sequence,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CAPTION, SAFE_ZONE} from '../brand/tokens';
import {ensureFonts} from '../brand/fonts';
import {ColorLook} from '../color/ColorLook';
import {segmentTransform, transformCss} from '../framing/framing';
import {edlSchema, outputDuration, segmentFrames, type Edl, type Segment} from '../lib/schema';
import {OverlayLayer} from '../motion-graphics/OverlayLayer';
import {SfxLayer} from '../audio/SfxLayer';
import {WordCaption} from '../subtitles/WordCaption';

export {edlSchema};

/**
 * Composición maestra: toma un EDL y produce el video final con el lenguaje Vocare Iuris.
 * Capas (de abajo arriba): footage reencuadrado + look de color → imagen de fondo →
 * motion graphics → subtítulo palabra-a-palabra → SFX/música.
 */
export const VocareEdit: React.FC<Edl> = (edl) => {
  ensureFonts();
  const {fps} = useVideoConfig();
  const segFrames = edl.segments.map((s) => segmentFrames(s, fps));
  const starts = segFrames.reduce<number[]>((acc, f, i) => [...acc, (acc[i] ?? 0) + f], [0]);
  const src = staticFile(edl.source.graded ?? edl.source.file);

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <ColorLook enabled={edl.colorPreset !== 'none' && !edl.colorAppliedInSource && !edl.source.graded}>
        <Series>
          {edl.segments.map((seg, i) => (
            <Series.Sequence key={seg.id} durationInFrames={segFrames[i]} name={`${seg.id}${seg.role ? ' · ' + seg.role : ''}`}>
              <SegmentClip seg={seg} src={src} durationInFrames={segFrames[i]} />
            </Series.Sequence>
          ))}
        </Series>
      </ColorLook>

      <OverlayLayer overlays={edl.overlays} layer="back" />
      <OverlayLayer overlays={edl.overlays} layer="behind" />
      {edl.personMatte ? <PersonLayer edl={edl} starts={starts} segFrames={segFrames} /> : null}
      <OverlayLayer overlays={edl.overlays} layer="front" />

      {edl.captions.map((c, i) => {
        // [REF] la letra gigante ocupa el lugar del subtítulo: se oculta mientras está en pantalla
        if (edl.overlays.some((o) => (o.type === 'bigLetter' || o.type === 'kineticWord') && c.start < o.end && c.end > o.start)) return null;
        const from = Math.round(c.start * fps);
        const dur = Math.max(1, Math.round(c.end * fps) - from);
        const segIdx = Math.max(0, starts.findIndex((s, k) => from >= s && from < (starts[k + 1] ?? Infinity)));
        const seg = edl.segments[Math.min(segIdx, edl.segments.length - 1)];
        const t = segmentTransform(seg, from - starts[segIdx], segFrames[segIdx], fps);
        // sin seguimiento: el rostro sube al acercar y el subtítulo sube con él
        const y = c.y ?? Math.max(0.12, CAPTION.defaultY - (t.scale - 1) * 0.16 + t.y * 0.5);
        // con seguimiento: posición recalculada en cada fotograma sobre la cabeza
        const multi = c.who && edl.headTracks?.tracks[c.who] ? {fps: edl.headTracks.fps, ...edl.headTracks.tracks[c.who]} : null;
        const track = multi ?? edl.headTrack;
        const follow = track && c.y === undefined ? (local: number) => headAnchor(edl, track, starts, segFrames, from + local, fps) : undefined;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none" name={`“${c.text}”`}>
            <WordCaption text={c.text} emphasis={c.emphasis} y={y} follow={follow} durationInFrames={dur} size={edl.captionScale ?? 1} />
          </Sequence>
        );
      })}

      <SfxLayer sfx={edl.sfx} music={edl.music} />
      {edl.showSafeZones ? <SafeZones /> : null}
    </AbsoluteFill>
  );
};

/**
 * Punto de anclaje del subtítulo en un fotograma de la edición: toma la cabeza del
 * presentador en el fotograma FUENTE correspondiente y le aplica el mismo reencuadre
 * (escala con origen 50 %/32 % + desplazamiento) que tiene el video en ese plano.
 */
const headAnchor = (edl: Edl, track: {fps: number; cx: number[]; top: number[]}, starts: number[], segFrames: number[], frame: number, fps: number) => {
  let k = 0;
  while (k < segFrames.length - 1 && frame >= starts[k + 1]) k++;
  const seg = edl.segments[k];
  const local = frame - starts[k];
  const t = segmentTransform(seg, local, segFrames[k], fps);
  const srcIdx = Math.min(track.cx.length - 1, Math.max(0, Math.round((seg.in + local / fps) * track.fps)));
  const ox = 0.5;
  const oy = 0.32;
  const hx = ox + (track.cx[srcIdx] - ox) * t.scale + t.x;
  const hy = oy + (track.top[srcIdx] - oy) * t.scale + t.y;
  return {
    // con varias personas el subtítulo debe poder llegar a la cabeza de quien está en el borde
    x: edl.headTracks ? Math.min(0.9, Math.max(0.1, hx)) : Math.min(CAPTION.maxX, Math.max(CAPTION.minX, hx)),
    y: Math.max(CAPTION.minY, hy - CAPTION.headGap),
  };
};

/**
 * Recorte del presentador (alfa) encima de los recursos "behindPerson": sólo mientras alguno
 * está en pantalla, sincronizado con el plano y con el mismo reencuadre que el video.
 */
const PersonLayer: React.FC<{edl: Edl; starts: number[]; segFrames: number[]}> = ({edl, starts, segFrames}) => {
  const {fps} = useVideoConfig();
  const src = staticFile(edl.personMatte!);
  const pieces: Array<{from: number; dur: number; seg: Segment; offset: number; k: number}> = [];
  edl.overlays
    .filter((o) => o.behindPerson)
    .forEach((o) => {
      const a = Math.round(o.start * fps);
      const b = Math.round(o.end * fps);
      edl.segments.forEach((seg, k) => {
        const s0 = starts[k];
        const s1 = s0 + segFrames[k];
        const from = Math.max(a, s0);
        const to = Math.min(b, s1);
        if (to > from) pieces.push({from, dur: to - from, seg, offset: from - s0, k});
      });
    });
  return (
    <>
      {pieces.map((p, i) => (
        <Sequence key={i} from={p.from} durationInFrames={p.dur} layout="none" name={`recorte persona ${p.seg.id}`}>
          <MatteClip seg={p.seg} src={src} offset={p.offset} segDuration={segFrames[p.k]} />
        </Sequence>
      ))}
    </>
  );
};

const MatteClip: React.FC<{seg: Segment; src: string; offset: number; segDuration: number}> = ({seg, src, offset, segDuration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = segmentTransform(seg, frame + offset, segDuration, fps);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={src}
        transparent
        muted
        trimBefore={Math.round(seg.in * fps) + offset}
        style={{width: '100%', height: '100%', objectFit: 'cover', ...transformCss(t)}}
      />
    </AbsoluteFill>
  );
};

const SegmentClip: React.FC<{seg: Segment; src: string; durationInFrames: number}> = ({seg, src, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = segmentTransform(seg, frame, durationInFrames, fps);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={src}
        trimBefore={Math.round(seg.in * fps)}
        trimAfter={Math.round(seg.out * fps)}
        // micro-fundido de 1 frame en cada corte para evitar clics de audio
        volume={(f) => interpolate(f, [0, 1, durationInFrames - 1, durationInFrames], [0.6, 1, 1, 0.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        style={{width: '100%', height: '100%', objectFit: 'cover', ...transformCss(t)}}
      />
    </AbsoluteFill>
  );
};

const SafeZones: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${SAFE_ZONE.top * 100}%`, background: 'rgba(255,0,0,0.25)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${SAFE_ZONE.bottom * 100}%`, background: 'rgba(255,0,0,0.25)'}} />
    <div style={{position: 'absolute', top: 0, bottom: 0, right: 0, width: `${SAFE_ZONE.right * 100}%`, background: 'rgba(255,0,0,0.18)'}} />
  </AbsoluteFill>
);

export const calculateEditMetadata: CalculateMetadataFunction<Edl> = ({props}) => {
  // fps de la edición = fps del footage (24 o 30): nunca se duplican fotogramas
  const fps = Math.round(props.source.fps) || 30;
  return {
    fps,
    width: 1080,
    height: 1920,
    // misma regla de redondeo que la <Series> para que no sobren ni falten frames
    durationInFrames: Math.max(
      1,
      props.segments.reduce((acc, s) => acc + segmentFrames(s, fps), 0) ||
        Math.round(outputDuration(props) * fps),
    ),
    props: edlSchema.parse(props),
  };
};
