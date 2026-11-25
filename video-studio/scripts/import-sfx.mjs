#!/usr/bin/env node
/**
 * Importa un efecto de sonido propio (el original de Vocare Iuris) y reemplaza al sintetizado.
 * npm run sfx:import -- <archivo.(mp3|wav|m4a|...)> <nombre>
 *   nombre ∈ pop click poi kiran fahhh riser stamp whoosh swish type ding boom
 * Convierte a WAV 48 kHz estéreo, recorta el silencio inicial y normaliza el pico a −3 dBFS.
 * Deja una marca <nombre>.custom para que `npm run sfx` no lo sobrescriba.
 */
import fs from 'node:fs';
import path from 'node:path';
import {run} from './lib/ff.mjs';
import {PUBLIC_DIR, parseArgs} from './lib/paths.mjs';

const NAMES = ['pop', 'click', 'poi', 'kiran', 'fahhh', 'riser', 'stamp', 'whoosh', 'swish', 'type', 'ding', 'boom'];
const [src, name] = parseArgs()._;
if (!src || !NAMES.includes(name)) {
  console.error(`Uso: npm run sfx:import -- <archivo> <${NAMES.join('|')}>`);
  process.exit(1);
}
const out = path.join(PUBLIC_DIR, 'sfx', `${name}.wav`);
const tmp = out.replace('.wav', '.tmp.wav');
run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', tmp]);
const det = run('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
const max = Number((det.match(/max_volume: (-?[\d.]+) dB/) || [])[1] ?? 0);
run('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', `volume=${(-3 - max).toFixed(2)}dB`, '-c:a', 'pcm_s16le', out]);
fs.rmSync(tmp);
fs.writeFileSync(out.replace('.wav', '.custom'), `importado de ${path.basename(src)} ${new Date().toISOString()}\n`);
console.log(`✓ ${name} reemplazado por ${path.basename(src)} → public/sfx/${name}.wav`);
