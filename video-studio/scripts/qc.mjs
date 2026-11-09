#!/usr/bin/env node
/**
 * CONTROL DE CALIDAD
 * npm run qc -- <slug> [--file ruta.mp4] [--no-transcribe]
 * Verifica: resolución/fps/duración, fotogramas negros, loudness, silencios residuales,
 * sincronía de subtítulos (re-transcribiendo el render), ortografía/términos dudosos,
 * y genera una hoja de contacto para REVISIÓN VISUAL obligatoria.
 * Resultado: projects/<slug>/qc/qc-report.md + contact-sheet.jpg
 */
import fs from 'node:fs';
import path from 'node:path';
import {blackFrames, ffprobe, loudness, python, run, silences} from './lib/ff.mjs';
import {STUDIO_ROOT, parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';

const args = parseArgs();
const slug = args._[0];
const P = projectPaths(slug);
const meta = readJson(P.meta);
const edl = readJson(P.edl);
const file = args.file ?? path.join(path.dirname(P.dir), meta.lastRender?.file ?? '');
if (!fs.existsSync(file)) throw new Error(`No se encuentra el render: ${file}`);
const qcDir = path.join(P.dir, 'qc');
fs.mkdirSync(qcDir, {recursive: true});

const checks = [];
const add = (name, ok, detail, level = ok ? 'ok' : 'error') => checks.push({name, ok, level, detail});

const pr = ffprobe(file);
const expected = edl.segments.reduce((a, s) => a + Math.max(1, Math.round(s.out * 30) - Math.round(s.in * 30)), 0) / 30;
const isPreview = /-preview\.mp4$/.test(file);
add('Resolución', pr.video.width === 1080 && pr.video.height === 1920, `${pr.video.width}x${pr.video.height}${isPreview ? ' (revisión)' : ''}`);
add('Bitrate de video', pr.bitrateKbps >= 6000, `${(pr.bitrateKbps / 1000).toFixed(1)} Mbps`, pr.bitrateKbps >= 6000 ? 'ok' : 'warn');
const cs = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=color_space,color_range,pix_fmt', '-of', 'json', file]).stdout).streams[0];
add('Espacio de color', cs.color_space === 'bt709' && cs.color_range === 'tv', `${cs.pix_fmt} · ${cs.color_space} · rango ${cs.color_range} (esperado bt709/tv como el original)`);
add('FPS', Math.abs(pr.video.fps - 30) < 0.01, `${pr.video.fps}`);
add('Duración', Math.abs(pr.duration - expected) < 0.15, `${pr.duration.toFixed(2)} s (EDL ${expected.toFixed(2)} s)`);
const black = blackFrames(file);
add('Fotogramas negros', black.length === 0, black.length ? black.map((b) => `${b.start.toFixed(2)}–${b.end.toFixed(2)}`).join(', ') : 'ninguno');
const L = loudness(file);
add('Loudness', Math.abs(L.integratedLufs + 14) <= 1, `${L.integratedLufs} LUFS (objetivo −14 ±1)`, Math.abs(L.integratedLufs + 14) <= 1 ? 'ok' : 'warn');
add('True peak', L.truePeakDb <= -0.5, `${L.truePeakDb} dBFS`, L.truePeakDb <= -0.5 ? 'ok' : 'warn');
const sil = silences(file, -38, 0.6).filter((s) => s.start > 0.2 && s.end < pr.duration - 0.2);
add('Silencios residuales (>0.6 s)', sil.length === 0, sil.length ? sil.map((s) => `${s.start.toFixed(2)}–${s.end.toFixed(2)}`).join(', ') : 'ninguno', sil.length ? 'warn' : 'ok');
const firstCap = edl.captions[0]?.start ?? 0;
add('Primera palabra en el frame 0', firstCap < 0.15, `${firstCap.toFixed(2)} s`, firstCap < 0.15 ? 'ok' : 'warn');

// sincronía y ortografía: re-transcribir el render y comparar con los subtítulos
let sync = null;
if (!args['no-transcribe']) {
  const tr = path.join(qcDir, 'render-transcript.json');
  run(python(), [path.join(STUDIO_ROOT, 'scripts', 'transcribe.py'), file, tr, '--model', args.model ?? 'small'], {stdio: ['ignore', 'ignore', 'inherit']});
  const words = readJson(tr).words;
  const norm = (w) => w.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
  const offsets = [];
  const mismatches = [];
  let j = 0;
  for (const c of edl.captions) {
    const n = norm(c.text);
    let k = j;
    while (k < words.length && k < j + 4 && norm(words[k].w) !== n) k++;
    if (k < words.length && norm(words[k].w) === n) {
      offsets.push(c.start - words[k].s);
      j = k + 1;
    } else {
      const near = words.find((w) => Math.abs(w.s - c.start) < 0.25);
      mismatches.push({at: c.start, caption: c.text, heard: near?.w ?? '?'});
    }
  }
  offsets.sort((a, b) => a - b);
  const med = offsets.length ? offsets[Math.floor(offsets.length / 2)] : 0;
  const p90 = offsets.length ? [...offsets].map(Math.abs).sort((a, b) => a - b)[Math.floor(offsets.length * 0.9)] : 0;
  sync = {matched: offsets.length, total: edl.captions.length, medianOffset: med, p90AbsOffset: p90, mismatches};
  add('Sincronía de subtítulos', Math.abs(med) < 0.08 && p90 < 0.2, `mediana ${(med * 1000).toFixed(0)} ms, p90 |${(p90 * 1000).toFixed(0)}| ms, ${offsets.length}/${edl.captions.length} palabras alineadas`, Math.abs(med) < 0.08 && p90 < 0.2 ? 'ok' : 'warn');
  add('Ortografía / términos', mismatches.length <= Math.ceil(edl.captions.length * 0.08), `${mismatches.length} palabras de subtítulo no coinciden con lo que se oye (revisar lista)`, mismatches.length <= Math.ceil(edl.captions.length * 0.08) ? 'ok' : 'warn');
}

// hoja de contacto: 1 fotograma por segundo
const sheet = path.join(qcDir, 'contact-sheet.jpg');
const cols = 8;
const rows = Math.ceil(pr.duration / cols);
run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=1,scale=180:-2,tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', '-q:v', '3', sheet]);

const ok = checks.every((c) => c.level !== 'error');
const report = `# QC — ${edl.title}
Archivo: \`${path.relative(STUDIO_ROOT, file)}\` · ${new Date().toISOString()}

| Verificación | Estado | Detalle |
|---|---|---|
${checks.map((c) => `| ${c.name} | ${c.level === 'ok' ? '✅' : c.level === 'warn' ? '⚠️' : '❌'} | ${c.detail} |`).join('\n')}

${sync?.mismatches?.length ? `## Palabras a verificar\n${sync.mismatches.map((m) => `- ${m.at.toFixed(2)} s: subtítulo “${m.caption}” / se oye “${m.heard}”`).join('\n')}\n` : ''}
## Revisión visual (obligatoria)
Hoja de contacto: \`qc/contact-sheet.jpg\` (1 fotograma/seg). Revisar: legibilidad del subtítulo,
que no tape el rostro, coherencia de color entre planos, recursos gráficos dentro de zona segura,
ausencia de saltos de encuadre bruscos no intencionales, precisión jurídica de tarjetas y etiquetas.

Resultado automático: **${ok ? 'APTO (pendiente de revisión visual)' : 'NO APTO'}**
`;
fs.writeFileSync(path.join(qcDir, 'qc-report.md'), report);
writeJson(path.join(qcDir, 'qc.json'), {checks, sync, loudness: L, file});
console.log(report);
if (!ok) process.exitCode = 1;
