import React from 'react';
import {AbsoluteFill} from 'remotion';
import preset from '../../color-presets/combinacion-visual.json';

/**
 * Aproximación en tiempo real (CSS) del preset «Combinación visual».
 * El render final usa la versión FFmpeg (scripts/grade.mjs), que es la calibrada.
 * Esta capa sirve para previsualizar en Remotion Studio cuando el footage aún no está graduado.
 *
 * Implementación: el contenido se dibuja dos veces — base con filtro de tono y una copia
 * desenfocada en modo `screen` para el glow de altas luces.
 */
export const ColorLook: React.FC<{enabled: boolean; children: React.ReactNode}> = ({enabled, children}) => {
  if (!enabled) return <AbsoluteFill>{children}</AbsoluteFill>;
  const {filter, glowOpacity, glowBlurPx} = preset.css;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter}}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          filter: `${filter} brightness(1.15) blur(${glowBlurPx}px)`,
          mixBlendMode: 'screen',
          opacity: glowOpacity,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
