import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CAPTION, COLORS, FONTS} from '../brand/tokens';

/**
 * Subtítulo palabra-a-palabra de Vocare Iuris [REF]:
 *  - UNA palabra en pantalla, minúsculas, DM Sans Bold (itálica)
 *  - amarillo (#FFE61B) con trazo delgado amarillo oscuro (#D9A800), glow amarillo difuso
 *    y sombra corta oscura para legibilidad
 *  - SIGUE LA CABEZA del presentador fotograma a fotograma (prop follow), sobre el pelo
 *  - aparición por corte seco, sincronizada con el inicio de la palabra
 * Énfasis [REC]: palabras clave (ilegal, derecho, ley…) con +12% de tamaño y micro-pop de 3 frames.
 */
export const WordCaption: React.FC<{
  text: string;
  emphasis?: boolean;
  y?: number;
  /** posición dinámica por fotograma (seguimiento de cabeza); x,y normalizados 0–1 */
  follow?: (localFrame: number) => {x: number; y: number};
  durationInFrames: number;
}> = ({
  text,
  emphasis = false,
  y = CAPTION.defaultY,
  follow,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const pos = follow ? follow(frame) : {x: 0.5, y};
  const pop = emphasis && CAPTION.keywordPop ? spring({frame, fps, config: {damping: 12, stiffness: 300}, durationInFrames: 5}) : 1;
  const scale = (emphasis ? 1.32 : 1) * interpolate(pop, [0, 1], [0.86, 1]);
  const display = CAPTION.lowercase ? smartLower(text) : text;
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x * width,
        top: pos.y * height,
        transform: `translate(-50%, -50%) scale(${scale})`,
        textAlign: 'center',
        fontFamily: FONTS.caption,
        fontStyle: CAPTION.italic ? 'italic' : 'normal',
        fontWeight: CAPTION.fontWeight,
        fontSize: CAPTION.fontSize,
        letterSpacing: '0.005em',
        color: COLORS.captionYellow,
        // trazo exterior delgado en amarillo oscuro: paint-order lo dibuja detrás del relleno,
        // así el grosor visible es la mitad del valor y no adelgaza la letra
        WebkitTextStroke: CAPTION.strokeWidth > 0 ? `${CAPTION.strokeWidth * 2}px ${COLORS.captionStroke}` : undefined,
        paintOrder: 'stroke fill',
        textShadow: [
          `0 0 6px ${COLORS.captionGlow}`,
          `0 0 14px ${COLORS.captionGlow}`,
          `0 3px 4px ${COLORS.captionShadow}`,
        ].join(', '),
        whiteSpace: 'nowrap',
      }}
    >
      {display}
    </div>
  );
};

/** Minúsculas respetando siglas (SBS, INDECOPI), números y artículos (176-B). */
export const smartLower = (w: string) => {
  const core = w.replace(/[^\p{L}\p{N}]/gu, '');
  if (core.length >= 2 && core === core.toUpperCase() && /\p{L}/u.test(core)) return w; // sigla
  return w.toLocaleLowerCase('es');
};
