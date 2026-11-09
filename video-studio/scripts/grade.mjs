#!/usr/bin/env node
/**
 * Tratamiento de color — aplica el preset (por defecto «combinacion-visual») al proxy.
 * npm run grade -- <slug> [--preset combinacion-visual]
 * npm run grade -- --file in.mp4 --out out.mp4        (uso suelto)
 * Resultado: public/footage/<slug>/graded.mp4 y edl.source.graded actualizado.
 */
import fs from 'node:fs';
import path from 'node:path';
import {buildFilterGraph, loadPreset} from './lib/color.mjs';
import {run} from './lib/ff.mjs';
import {PUBLIC_DIR, parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';

const args = parseArgs();
const preset = loadPreset(args.preset ?? 'combinacion-visual');
const graph = buildFilterGraph(preset);

const grade = (input, output) => {
  console.log(`→ Aplicando «${preset.name}» → ${path.basename(output)}`);
  run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-filter_complex', graph, '-map', '[out]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '15', '-c:a', 'copy', '-movflags', '+faststart', output]);
};

if (args.file) {
  grade(args.file, args.out ?? args.file.replace(/(\.\w+)$/, '.graded$1'));
  process.exit(0);
}
const slug = args._[0];
const P = projectPaths(slug);
const meta = readJson(P.meta);
const input = path.join(PUBLIC_DIR, meta.proxy);
const output = path.join(P.publicFootage, 'graded.mp4');
grade(input, output);
if (fs.existsSync(P.edl)) {
  const edl = readJson(P.edl);
  edl.source.graded = path.relative(PUBLIC_DIR, output);
  edl.colorPreset = preset.id;
  edl.colorAppliedInSource = true;
  writeJson(P.edl, edl);
}
console.log('✓ Footage graduado. El render usará graded.mp4 (sin duplicar el look en Remotion).');
