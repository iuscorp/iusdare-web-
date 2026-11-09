#!/usr/bin/env node
/**
 * PASOS 2–3 — ESTRUCTURA NARRATIVA + CÓDIGOS NATIVOS (borrador automático)
 * npm run draft -- <slug> [--force]
 * Crea projects/<slug>/edl.json a partir del plan de limpieza. El borrador es un punto de
 * partida: el editor (Claude) lo afina según el brief antes de generar el canvas.
 * No sobrescribe un EDL existente salvo con --force (protege ediciones manuales).
 */
import fs from 'node:fs';
import path from 'node:path';
import {buildEdl} from './lib/edit.mjs';
import {emojisInEdl, ensureStickers} from './lib/assets.mjs';
import {parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';

const args = parseArgs();
const slug = args._[0];
const P = projectPaths(slug);
if (fs.existsSync(P.edl) && !args.force) {
  console.error(`Ya existe projects/${slug}/edl.json. Usa --force para regenerarlo (se perderán cambios manuales).`);
  process.exit(1);
}
const meta = readJson(P.meta);
const probe = readJson(P.probe);
const clean = readJson(P.cleanup);
const edl = buildEdl({
  slug,
  title: meta.title,
  source: {file: meta.proxy, width: 1080, height: 1920, fps: 30, duration: probe.proxy.duration},
  clean,
});
const headFile = path.join(P.analysisDir, 'head-track.json');
if (fs.existsSync(headFile)) {
  const h = readJson(headFile);
  edl.headTrack = {fps: h.fps, cx: h.cx, top: h.top};
} else console.warn('⚠️ Sin head-track.json: el subtítulo usará posición fija (ejecuta npm run analyze).');
const missing = ensureStickers(emojisInEdl(edl));
if (missing.length) console.warn('⚠️ Emojis sin asset 3D:', missing.join(' '));
writeJson(P.edl, edl);
meta.status = 'borrador-edl';
writeJson(P.meta, meta);
const dur = edl.segments.reduce((a, s) => a + s.out - s.in, 0);
console.log(`✓ EDL borrador: ${edl.segments.length} planos, ${edl.captions.length} subtítulos, ${edl.overlays.length} recursos sugeridos, ${dur.toFixed(2)} s`);
console.log(`  Siguiente: revisar/afinar edl.json y ejecutar npm run canvas -- ${slug}`);
