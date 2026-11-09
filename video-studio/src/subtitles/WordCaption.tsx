import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CAPTION, COLORS, FONTS} from '../brand/tokens';

/**
 * Subtítulo palabra-a-palabra de Vocare Iuris [REF]:
 *  - UNA palabra en pantalla, minúsculas, sans geométrica ExtraBold Itálica
 *  - amarillo (#FFE61B) con glow amarillo difuso + sombra corta oscura para legibilidad
 *  - centrado horizontal, en el espacio negativo sobre la cabeza
 *  - aparición por corte seco, sincronizada con el inicio de la palabra
 * Énfasis [REC]: palabras clave (ilegal, derecho, ley…) con +12% de tamaño y micro-pop de 3 frames.
 */
export const WordCaption: React.FC<{text: string; emphasis?: boolean; y?: number; durationInFrames: number}> = ({
  text,
  emphasis = false,
  y = CAPTION.defaultY,
}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const pop = emphasis && CAPTION.keywordPop ? spring({frame, fps, config: {damping: 12, stiffness: 300}, durationInFrames: 5}) : 1;
  const scale = (emphasis ? 1.12 : 1) * interpolate(pop, [0, 1], [0.86, 1]);
  const display = CAPTION.lowercase ? smartLower(text) : text;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y * height,
        transform: `translateY(-50%) scale(${scale})`,
        textAlign: 'center',
        fontFamily: FONTS.caption,
        fontStyle: 'italic',
        fontWeight: CAPTION.fontWeight,
        fontSize: CAPTION.fontSize,
        letterSpacing: '0.005em',
        color: COLORS.captionYellow,
        textShadow: [
          `0 0 10px ${COLORS.captionGlow}`,
          `0 0 22px ${COLORS.captionGlow}`,
          `0 0 38px rgba(255, 214, 0, 0.45)`,
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
