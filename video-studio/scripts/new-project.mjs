#!/usr/bin/env node
/**
 * npm run new -- <slug> <ruta/al/raw.mp4> [--title "Título"]
 * Crea projects/<slug>/ con el brief, normaliza el footage a un proxy de edición
 * (H.264, 30 fps CFR, 1080x1920, audio 48 kHz) y lo publica en public/footage/<slug>/.
 */
import fs from 'node:fs';
import path from 'node:path';
import {ffprobe, run} from './lib/ff.mjs';
import {STUDIO_ROOT, parseArgs, projectPaths, writeJson} from './lib/paths.mjs';

const args = parseArgs();
const [slug, raw] = args._;
if (!slug || !raw) {
  console.error('Uso: npm run new -- <slug> <ruta/al/raw.mp4> [--title "Título"]');
  process.exit(1);
}
const P = projectPaths(slug);
if (!fs.existsSync(raw)) throw new Error(`No existe el archivo: ${raw}`);
fs.mkdirSync(P.analysisDir, {recursive: true});
fs.mkdirSync(P.publicFootage, {recursive: true});

// 1. copia del original intacto
const rawDir = path.join(STUDIO_ROOT, 'footage', 'raw', slug);
fs.mkdirSync(rawDir, {recursive: true});
const rawCopy = path.join(rawDir, path.basename(raw));
if (path.resolve(raw) !== path.resolve(rawCopy)) fs.copyFileSync(raw, rawCopy);

// 2. proxy de edición normalizado
const probe = ffprobe(rawCopy);
const proxy = path.join(P.publicFootage, 'source.mp4');
const v = probe.video ?? {};
const native = v.width === 1080 && v.height === 1920 && Math.abs(v.fps - 30) < 0.01 && v.codec === 'h264' && v.pixFmt === 'yuv420p' && !v.rotation;
if (native) {
  // ya está en el formato de trabajo: se copia SIN recodificar (calidad idéntica al original)
  console.log(`→ ${path.basename(raw)} ya es 1080x1920/30p H.264: se usa el original sin recodificar…`);
  run('ffmpeg', ['-v', 'error', '-y', '-i', rawCopy, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', proxy]);
} else {
  const vf = 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,format=yuv420p';
  console.log(`→ Normalizando ${path.basename(raw)} (${v.width}x${v.height} @ ${v.fps?.toFixed(2)} fps) a 1080x1920/30p (alta calidad)…`);
  run('ffmpeg', ['-v', 'error', '-y', '-i', rawCopy, '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-g', '15', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', proxy]);
}

// 3. brief
if (!fs.existsSync(P.brief)) {
  const tpl = fs.readFileSync(path.join(STUDIO_ROOT, 'briefs', 'TEMPLATE.md'), 'utf8');
  fs.writeFileSync(P.brief, tpl.replace('{{TITULO}}', args.title ?? slug));
}

writeJson(P.meta, {
  slug,
  title: args.title ?? slug,
  createdAt: new Date().toISOString(),
  raw: path.relative(STUDIO_ROOT, rawCopy),
  proxy: path.relative(path.join(STUDIO_ROOT, 'public'), proxy),
  status: 'nuevo',
  workflow: ['ANÁLISIS', 'ESTRUCTURA NARRATIVA', 'CÓDIGOS NATIVOS', 'CANVAS VISUAL', 'APROBACIÓN', 'EDICIÓN COMPLETA', 'CONTROL DE CALIDAD', 'EXPORTACIÓN'],
  approval: {approved: false, approvedAt: null, notes: []},
});
console.log(`✓ Proyecto creado: projects/${slug}/  (completa brief.md y ejecuta: npm run analyze -- ${slug})`);
