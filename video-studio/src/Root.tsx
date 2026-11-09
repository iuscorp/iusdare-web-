import React from 'react';
import {Composition} from 'remotion';
import {FORMAT} from './brand/tokens';
import {ComponentLibrary, LIBRARY_ITEMS, LIBRARY_SECONDS_PER_ITEM} from './compositions/ComponentLibrary';
import {VocareEdit, calculateEditMetadata, edlSchema} from './compositions/VocareEdit';
import type {Edl} from './lib/schema';

/** EDL de ejemplo (sin footage real): se reemplaza con --props=projects/<slug>/edl.json al renderizar. */
const placeholder: Edl = {
  slug: 'placeholder',
  title: 'Cargue un EDL con --props',
  source: {file: 'footage/placeholder.mp4', width: 1080, height: 1920, fps: 30, duration: 2},
  colorPreset: 'combinacion-visual',
  colorAppliedInSource: false,
  segments: [{id: 's1', in: 0, out: 2, framing: 'base', move: 'none'}],
  captions: [],
  overlays: [],
  sfx: [],
  showSafeZones: false,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VocareEdit"
        component={VocareEdit}
        schema={edlSchema}
        defaultProps={placeholder}
        calculateMetadata={calculateEditMetadata}
        width={FORMAT.width}
        height={FORMAT.height}
        fps={FORMAT.fps}
        durationInFrames={60}
      />
      <Composition
        id="ComponentLibrary"
        component={ComponentLibrary}
        width={FORMAT.width}
        height={FORMAT.height}
        fps={FORMAT.fps}
        durationInFrames={LIBRARY_ITEMS * LIBRARY_SECONDS_PER_ITEM * FORMAT.fps}
      />
    </>
  );
};
