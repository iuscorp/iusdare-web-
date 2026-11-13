import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import type {Edl} from '../lib/schema';

const dbToGain = (db: number) => Math.pow(10, db / 20);

/**
 * Efectos sonoros puntuales [REF: transitorios de banda ancha coincidentes con apariciones
 * gráficas y crash zooms] y música opcional [REC: -30 dB bajo la voz].
 * Los SFX de public/sfx son sintetizados por scripts/make-sfx.mjs (sin licencias de terceros).
 */
export const SfxLayer: React.FC<{sfx: Edl['sfx']; music?: Edl['music']}> = ({sfx, music}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {music ? <Audio src={staticFile(music.file)} volume={dbToGain(music.volumeDb)} loop /> : null}
      {sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.at * fps))} durationInFrames={Math.round(fps * 2.5)} layout="none" name={`sfx ${s.name}`}>
          <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={dbToGain(s.volumeDb)} />
        </Sequence>
      ))}
    </>
  );
};
