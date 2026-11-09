#!/usr/bin/env node
/**
 * Genera la librería de efectos sonoros del estudio por síntesis (FFmpeg lavfi).
 * Sin samples de terceros → sin problemas de licencia. Reemplazables por SFX propios
 * con el mismo nombre en public/sfx/.
 *   pop    – aparición de sticker/tarjeta
 *   whoosh – crash zoom / cambio de escala fuerte
 *   swish  – entrada lateral de texto
 *   type   – tecleo de tarjeta de norma
 *   click  – cursor / selección
 *   ding   – revelación / dato clave
 *   boom   – golpe grave para el veredicto
 */
import path from 'node:path';
import fs from 'node:fs';
import {run} from './lib/ff.mjs';
import {PUBLIC_DIR} from './lib/paths.mjs';

const out = path.join(PUBLIC_DIR, 'sfx');
fs.mkdirSync(out, {recursive: true});

const defs = {
  pop: "sine=f=900:d=0.12[a];[a]asetrate=48000*1.0,afade=t=out:st=0.02:d=0.1,volume=0.9,aformat=sample_rates=48000",
  whoosh:
    "anoisesrc=d=0.45:c=pink:a=0.6[n];[n]highpass=f=400,lowpass=f=5000,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.2,aformat=sample_rates=48000",
  swish: "anoisesrc=d=0.22:c=white:a=0.4[n];[n]bandpass=f=3500:width_type=h:w=2500,afade=t=in:d=0.08,afade=t=out:st=0.08:d=0.14,aformat=sample_rates=48000",
  type: "anoisesrc=d=0.035:c=white:a=0.7[n];[n]highpass=f=2500,afade=t=out:st=0.005:d=0.03,aformat=sample_rates=48000",
  click: "sine=f=2400:d=0.025[a];[a]afade=t=out:st=0.004:d=0.02,aformat=sample_rates=48000",
  ding: "sine=f=1320:d=0.7[a];sine=f=1980:d=0.7[b];[a][b]amix=inputs=2,afade=t=out:st=0.05:d=0.65,volume=0.8,aformat=sample_rates=48000",
  boom: "sine=f=60:d=0.6[a];anoisesrc=d=0.08:c=brown:a=0.8[n];[a][n]amix=inputs=2:duration=longest,lowpass=f=250,afade=t=out:st=0.05:d=0.55,volume=2,aformat=sample_rates=48000",
};

for (const [name, graph] of Object.entries(defs)) {
  const file = path.join(out, `${name}.wav`);
  // pop: barrido descendente para que suene "burbuja" (no tono plano)
  const g = name === 'pop' ? "aevalsrc='0.8*sin(2*PI*(1400-9000*t)*t)*exp(-28*t)':d=0.12:s=48000" : graph;
  const tmp = file.replace('.wav', '.tmp.wav');
  run('ffmpeg', ['-v', 'error', '-y', '-filter_complex', g, '-ac', '2', '-c:a', 'pcm_s16le', tmp]);
  // normalizar pico a -3 dBFS para que los niveles del EDL (volumeDb) sean comparables
  const det = run('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
  const max = Number((det.match(/max_volume: (-?[\d.]+) dB/) || [])[1] ?? 0);
  run('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', `volume=${(-3 - max).toFixed(2)}dB`, '-c:a', 'pcm_s16le', file]);
  fs.rmSync(tmp);
  console.log('✓', path.relative(process.cwd(), file));
}
