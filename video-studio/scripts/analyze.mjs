#!/usr/bin/env node
/**
 * PASO 1 — ANÁLISIS DEL RAW FOOTAGE
 * npm run analyze -- <slug> [--model small|medium]
 * Genera en projects/<slug>/analysis/:
 *   probe.json       duración, resolución, fps, códecs, loudness, silencios, negros, exposición
 *   transcript.json  transcripción palabra-a-palabra (Whisper)
 *   cleanup.json     plan de limpieza: silencios, muletillas, repeticiones, pausas conservadas
 *   analysis.md      resumen legible
 */
import fs from 'node:fs';
import path from 'node:path';
import {cleanup} from './lib/edit.mjs';
import {blackFrames, ffprobe, loudness, python, run, silences} from './lib/ff.mjs';
import {PUBLIC_DIR, STUDIO_ROOT, parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';

const args = parseArgs();
const slug = args._[0];
const P = projectPaths(slug);
const meta = readJson(P.meta);
const proxy = path.join(PUBLIC_DIR, meta.proxy);
const rawFile = path.join(STUDIO_ROOT, meta.raw);

console.log('→ Inspección técnica…');
const rawProbe = ffprobe(rawFile);
const lufs = loudness(proxy);
const sil = silences(proxy);
const black = blackFrames(proxy);
// exposición / nitidez media por muestreo (signalstats)
const stats = run('ffmpeg', ['-hide_banner', '-i', proxy, '-vf', 'fps=1,signalstats,metadata=print', '-an', '-f', 'null', '-']).stderr;
const yavg = [...stats.matchAll(/lavfi.signalstats.YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
const satavg = [...stats.matchAll(/lavfi.signalstats.SATAVG=([\d.]+)/g)].map((m) => Number(m[1]));
const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
const probe = {
  raw: rawProbe,
  proxy: ffprobe(proxy),
  audio: {...lufs, silences: sil, silenceTotal: Math.round(sil.reduce((a, s) => a + (s.end - s.start), 0) * 100) / 100},
  video: {blackSegments: black, lumaAvg: avg(yavg), saturationAvg: avg(satavg)},
  warnings: [],
};
if (rawProbe.video?.height < 1920) probe.warnings.push(`Resolución de origen ${rawProbe.video?.width}x${rawProbe.video?.height}: se escala a 1080x1920 (posible pérdida de nitidez; limita los punch-in a ≤1.15x).`);
if (rawProbe.video && Math.abs(rawProbe.video.fps - 30) > 0.5) probe.warnings.push(`FPS de origen ${rawProbe.video.fps.toFixed(2)} → convertido a 30 fps.`);
if (lufs.integratedLufs < -30) probe.warnings.push(`Audio muy bajo (${lufs.integratedLufs} LUFS). Revisar ganancia del micrófono.`);
if (lufs.truePeakDb > -0.5) probe.warnings.push(`Posible saturación de audio (true peak ${lufs.truePeakDb} dBFS).`);
if (probe.video.lumaAvg && probe.video.lumaAvg < 70) probe.warnings.push('Imagen oscura: el preset de color levantará medios tonos, revisar ruido.');
writeJson(P.probe, probe);

console.log('→ Transcripción (Whisper)…');
if (!fs.existsSync(P.transcript) || args.force) {
  run(python(), [path.join(STUDIO_ROOT, 'scripts', 'transcribe.py'), proxy, P.transcript, '--model', args.model ?? 'small'], {stdio: ['ignore', 'inherit', 'inherit']});
}
const transcript = readJson(P.transcript);

console.log('→ Seguimiento de la cabeza (subtítulo que sigue al presentador)…');
const headFile = path.join(P.analysisDir, 'head-track.json');
if (!fs.existsSync(headFile) || args.force) {
  run(python(), [path.join(STUDIO_ROOT, 'scripts', 'track-head.py'), proxy, headFile], {stdio: ['ignore', 'inherit', 'inherit']});
}

console.log('→ Plan de limpieza…');
const glossary = readJson(path.join(STUDIO_ROOT, 'templates', 'glossary.json'));
// glosario del proyecto (tiene prioridad sobre el global)
const projGlossary = path.join(P.dir, 'glossary.json');
if (fs.existsSync(projGlossary)) glossary.corrections = [...readJson(projGlossary).corrections, ...glossary.corrections];
// selects.json (opcional): tomas elegidas por el editor en orden de guion, [{in, out, note}]
const selectsFile = path.join(P.dir, 'selects.json');
const selects = fs.existsSync(selectsFile) ? readJson(selectsFile) : null;
if (selects) console.log(`  usando ${selects.length} tomas elegidas (selects.json)`);
const plan = cleanup(transcript, {silences: silences(proxy, -40, 0.3), glossary, selects});
writeJson(P.cleanup, plan);

const md = `# Análisis — ${meta.title}

## Técnica
| | Original | Proxy de edición |
|---|---|---|
| Resolución | ${rawProbe.video?.width}x${rawProbe.video?.height} | 1080x1920 |
| FPS | ${rawProbe.video?.fps?.toFixed(2)} | ${probe.proxy.video?.fps?.toFixed(0)} |
| Duración | ${rawProbe.duration.toFixed(2)} s | ${probe.proxy.duration.toFixed(2)} s |
| Códec | ${rawProbe.video?.codec} / ${rawProbe.audio?.codec} | h264 / aac |

- Loudness: **${lufs.integratedLufs} LUFS** (LRA ${lufs.lra} LU, true peak ${lufs.truePeakDb} dBFS) → se normaliza a -14 LUFS en la exportación.
- Silencios (< -35 dB, ≥ 0.25 s): ${sil.length} (${probe.audio.silenceTotal} s en total).
- Luma media: ${probe.video.lumaAvg} · Saturación media: ${probe.video.saturationAvg}.
- Fotogramas negros: ${black.length ? black.map((b) => `${b.start.toFixed(2)}–${b.end.toFixed(2)} s`).join(', ') : 'ninguno'}.
${probe.warnings.map((w) => `- ⚠️ ${w}`).join('\n')}

## Transcripción
> ${transcript.text}

## Limpieza propuesta
- Duración original: ${plan.stats.sourceDuration.toFixed(2)} s → editada: **${plan.stats.outputDuration.toFixed(2)} s** (−${plan.stats.savedSeconds.toFixed(2)} s).
- Ritmo resultante: **${plan.stats.wordsPerSecond} palabras/s** (referencias: 3.2–3.6).
- Eliminado: ${plan.removed.length} elementos (${count(plan.removed, 'silence')} silencios, ${count(plan.removed, 'filler')} muletillas, ${count(plan.removed, 'retake')} tomas repetidas, ${count(plan.removed, 'stutter')} tartamudeos).
- Pausas conservadas con función: ${plan.keptPauses.length}.
- Para revisar: ${plan.flags.length} (muletillas blandas / palabras de baja confianza).

${plan.removed.map((r) => `- \`${r.from.toFixed(2)}–${r.to.toFixed(2)}\` **${r.kind}** ${r.text}`).join('\n')}

### Revisión manual
${plan.flags.map((f) => `- \`${f.at.toFixed(2)}\` ${f.kind}: “${f.text}” — ${f.note}`).join('\n') || '- (nada)'}
`;
fs.writeFileSync(path.join(P.analysisDir, 'analysis.md'), md);
meta.status = 'analizado';
writeJson(P.meta, meta);
console.log(`✓ Análisis listo: projects/${slug}/analysis/analysis.md\n  Siguiente: npm run draft -- ${slug}`);

function count(list, kind) {
  return list.filter((r) => r.kind === kind).length;
}
