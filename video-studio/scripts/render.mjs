#!/usr/bin/env node
/**
 * PASO 6 — RENDER
 * npm run render -- <slug> --preview     versión de revisión (1080x1920, CRF 17) → previews/<slug>/
 * npm run render -- <slug>               versión final (requiere aprobación registrada) → exports/<slug>/
 * La versión final pasa por normalización de loudness (-14 LUFS, -1 dBTP) y QC automático.
 */
import fs from 'node:fs';
import path from 'node:path';
import {edlSchemaCheck} from './lib/validate.mjs';
import {emojisInEdl, ensureStickers} from './lib/assets.mjs';
import {ensurePersonMatte} from './lib/matte.mjs';
import {run} from './lib/ff.mjs';
import {parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';
import {cleanupBundle, renderVideo} from './lib/stills.mjs';

const args = parseArgs();
const slug = args._[0];
const P = projectPaths(slug);
const meta = readJson(P.meta);
const edl = readJson(P.edl);
// nunca dejar un video anterior en su lugar: se borra ANTES de validar, así si algo falla no queda nada que enviar por error
{
  const pv = Boolean(args.preview);
  const dir = pv ? P.previewsDir : P.exportsDir;
  fs.rmSync(path.join(dir, `${slug}${pv ? '-preview' : ''}.mp4`), {force: true});
}
if (ensurePersonMatte(slug, edl)) writeJson(P.edl, edl);
edlSchemaCheck(edl);
const missing = ensureStickers(emojisInEdl(edl));
if (missing.length) throw new Error(`Faltan assets de emoji: ${missing.join(' ')}`);

const preview = Boolean(args.preview);
if (!preview && !meta.approval?.approved) {
  console.error('✋ La edición definitiva requiere aprobación del canvas. Registra la aprobación con:\n   npm run approve -- ' + slug + ' "nota del director"');
  process.exit(2);
}

const outDir = preview ? P.previewsDir : P.exportsDir;
const raw = path.join(outDir, `${slug}${preview ? '-preview' : ''}.raw.mp4`);
const final = path.join(outDir, `${slug}${preview ? '-preview' : ''}.mp4`);
let last = -1;
console.log(`→ Renderizando ${preview ? 'PREVIEW' : 'FINAL'}…`);
await renderVideo(edl, raw, {
  // la revisión también va a resolución completa: se juzga la calidad real
  scale: 1,
  crf: preview ? 17 : 14,
  imageFormat: preview ? 'jpeg' : 'png',
  x264Preset: preview ? 'medium' : 'slow',
  onProgress: (p) => {
    const pct = Math.floor(p * 10) * 10;
    if (pct !== last) {
      last = pct;
      process.stdout.write(`  ${pct}%\n`);
    }
  },
});

cleanupBundle();
console.log('→ Normalizando loudness (−14 LUFS / −1 dBTP)…');
const pass1 = run('ffmpeg', ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-']).stderr;
const m = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
const ln = `loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', ln, '-ar', '48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final]);
fs.rmSync(raw);

meta.status = preview ? 'preview-renderizado' : 'exportado';
meta.lastRender = {file: path.relative(path.dirname(P.dir), final), at: new Date().toISOString(), preview};
writeJson(P.meta, meta);
console.log(`✓ ${final}`);
console.log(`→ Control de calidad…`);
run(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname), 'qc.mjs'), slug, '--file', final], {stdio: 'inherit'});
