import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {ensureFonts} from '../brand/fonts';
import {renderOverlay} from '../motion-graphics/OverlayLayer';
import type {Overlay} from '../lib/schema';
import {WordCaption} from '../subtitles/WordCaption';

/**
 * Catálogo visual de todos los componentes (sirve como guía de componentes y prueba de render).
 * Fondo neutro que imita la pared clara + sofá oscuro de las referencias.
 */
const DEMO: Array<{label: string; overlay?: Overlay; caption?: string; emphasis?: boolean}> = [
  {label: 'Subtítulo palabra-a-palabra', caption: 'revisaste'},
  {label: 'Subtítulo con énfasis', caption: 'ilegal', emphasis: true},
  {label: 'Sticker emoji 3D', caption: 'banco', overlay: {type: 'sticker', emoji: '🏦', size: 190, start: 0, end: 2}},
  {label: 'Tarjeta de norma (escritura)', caption: 'ley', overlay: {type: 'lawCard', title: 'Ley 30057', subtitle: 'Ley del Servicio Civil', color: 'white', start: 0, end: 2}},
  {label: 'Tarjeta de norma amarilla', caption: 'clara', overlay: {type: 'lawCard', title: 'Ley 29719', subtitle: '(Ley Antibullying)', color: 'yellow', start: 0, end: 2}},
  {label: 'Etiqueta seleccionada', caption: 'temporal', overlay: {type: 'selectionLabel', text: 'Inmediatez Temporal', cursor: true, start: 0, end: 2}},
  {label: 'Aspa de negación', caption: 'no', overlay: {type: 'denyMark', start: 0, end: 2}},
  {label: 'Ecuación de emojis', caption: 'permanentes', overlay: {type: 'emojiEquation', items: ['⚙️', '+', '⏳', '?'], start: 0, end: 2}},
  {label: 'Palabra cinética por sílabas', overlay: {type: 'kineticWord', syllables: ['De', 'nun', 'ciar'], start: 0, end: 2}},
  {label: 'Título de revelación', caption: 'ilegal', emphasis: true, overlay: {type: 'revealTitle', lines: ['Eso es', 'ilegal'], start: 0, end: 2}},
  {label: 'Badge de dato', caption: 'catorce', overlay: {type: 'textBadge', text: '(+14)', start: 0, end: 2}},
  {label: 'Sello de veredicto [REC]', caption: 'ilegal', emphasis: true, overlay: {type: 'verdictStamp', text: 'ILEGAL', tone: 'deny', start: 0, end: 2}},
  {label: 'Lista de pasos [REC]', caption: 'primero', overlay: {type: 'stepList', title: '¿Qué hacer?', steps: ['Reclama al banco', 'Guarda la constancia', 'Denuncia ante Indecopi'], start: 0, end: 2}},
  {label: 'Comparación [REC]', caption: 'privados', overlay: {type: 'comparison', left: {label: 'Público', emoji: '🏫'}, right: {label: 'Privado', emoji: '🏢'}, start: 0, end: 2}},
];

export const LIBRARY_SECONDS_PER_ITEM = 2;
export const LIBRARY_ITEMS = DEMO.length;

export const ComponentLibrary: React.FC = () => {
  ensureFonts();
  const {fps} = useVideoConfig();
  const per = LIBRARY_SECONDS_PER_ITEM * fps;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(#e9e6e1 0%, #dedad4 55%, #3a3a3e 55%, #2c2c30 100%)'}}>
      {DEMO.map((d, i) => (
        <Sequence key={i} from={i * per} durationInFrames={per} name={d.label}>
          <AbsoluteFill>
            <div style={{position: 'absolute', left: 300, top: 560, width: 480, height: 720, borderRadius: '240px 240px 40px 40px', background: '#8b6f5e', opacity: 0.55}} />
            {d.overlay ? renderOverlay(d.overlay, per) : null}
            {d.caption ? <WordCaption text={d.caption} emphasis={d.emphasis} durationInFrames={per} /> : null}
            <div style={{position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', fontFamily: 'VI Card, Inter', fontWeight: 700, fontSize: 38, color: 'white', opacity: 0.85}}>
              {d.label}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
