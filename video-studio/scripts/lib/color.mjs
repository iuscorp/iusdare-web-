import fs from 'node:fs';
import path from 'node:path';
import {STUDIO_ROOT} from './paths.mjs';

export const loadPreset = (id = 'combinacion-visual') => {
  const file = path.join(STUDIO_ROOT, 'color-presets', `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`Preset de color no encontrado: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

/**
 * Construye el filtergraph FFmpeg del preset. Entrada [0:v] → salida [out].
 * Orden: tono base (eq) → balance cálido → curva (negros profundos + roll-off de altas luces)
 *        → glow de altas luces (screen) → nitidez suave.
 */
export const buildFilterGraph = (preset, {input = '0:v', output = 'out'} = {}) => {
  const p = preset.params;
  const w = p.warmth;
  const cb = [
    `rs=${w.shadows[0]}:gs=${w.shadows[1]}:bs=${w.shadows[2]}`,
    `rm=${w.midtones[0]}:gm=${w.midtones[1]}:bm=${w.midtones[2]}`,
    `rh=${w.highlights[0]}:gh=${w.highlights[1]}:bh=${w.highlights[2]}`,
  ].join(':');
  const t = p.glow.threshold;
  return [
    `[${input}]format=gbrp,eq=contrast=${p.contrast}:brightness=${p.brightness}:saturation=${p.saturation}:gamma=${p.gamma},`,
    `colorbalance=${cb},curves=master='${p.curve}',split[vi_a][vi_b];`,
    `[vi_b]curves=master='0/0 ${t}/0 1/1',gblur=sigma=${p.glow.sigma}[vi_g];`,
    `[vi_a][vi_g]blend=all_mode=screen:all_opacity=${p.glow.opacity},`,
    `unsharp=${p.sharpen.size}:${p.sharpen.size}:${p.sharpen.amount},format=yuv420p[${output}]`,
  ].join('');
};
