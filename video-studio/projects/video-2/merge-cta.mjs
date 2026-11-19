#!/usr/bin/env node
/**
 * Une el clip del CTA (grabado aparte) al final del material principal de video-2 y desplaza
 * su transcripción y sus tomas elegidas.
 *
 * Importante (lección aprendida): unir con el demuxer concat copiando audio+video deja un hueco
 * de marcas de tiempo cuando audio y video de un clip no miden lo mismo (aquí 674.025 vs
 * 673.958 s). Remotion extrae entonces el audio del 2.º clip con cortes y repeticiones.
 * Solución: video copiado SIN huecos (sólo pistas de video) + audio recortado a la duración
 * exacta de cada video y concatenado de forma continua.
 * Uso: node projects/video-2/merge-cta.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(dir, '..', '..', 'public', 'footage', 'video-2');
const main = path.join(pub, 'main.mp4');
const cta = path.join(pub, 'cta.mp4');
const out = path.join(pub, 'source.mp4');
if (!fs.existsSync(main)) fs.renameSync(out, main);
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const vdur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', f], {encoding: 'utf8'}).trim());

const dMain = vdur(main);
const dCta = vdur(cta);
const tmp = (n) => path.join(pub, `_${n}`);
// 1) pistas de video sueltas y unidas sin recodificar
ff('-i', main, '-map', '0:v:0', '-c', 'copy', tmp('main_v.mp4'));
ff('-i', cta, '-map', '0:v:0', '-c', 'copy', tmp('cta_v.mp4'));
fs.writeFileSync(tmp('list.txt'), `file '${tmp('main_v.mp4')}'\nfile '${tmp('cta_v.mp4')}'\n`);
ff('-f', 'concat', '-safe', '0', '-i', tmp('list.txt'), '-c', 'copy', tmp('video.mp4'));
// 2) audio continuo: cada clip recortado/rellenado a la duración exacta de SU video
ff('-i', main, '-i', cta, '-filter_complex',
  `[0:a]atrim=0:${dMain},apad=whole_dur=${dMain},asetpts=N/SR/TB[a0];[1:a]atrim=0:${dCta},apad=whole_dur=${dCta},asetpts=N/SR/TB[a1];[a0][a1]concat=n=2:v=0:a=1[a]`,
  '-map', '[a]', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', tmp('audio.m4a'));
// 3) mux
ff('-i', tmp('video.mp4'), '-i', tmp('audio.m4a'), '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', out);
for (const n of ['main_v.mp4', 'cta_v.mp4', 'list.txt', 'video.mp4', 'audio.m4a']) fs.rmSync(tmp(n));
const offset = dMain;
console.log(`✓ source.mp4 = principal (${dMain.toFixed(3)} s) + CTA (${dCta.toFixed(3)} s), audio continuo`);

const A = path.join(dir, 'analysis');
const mainTr = path.join(A, 'transcript-main.json');
if (!fs.existsSync(mainTr)) fs.copyFileSync(path.join(A, 'transcript.json'), mainTr);
const t = JSON.parse(fs.readFileSync(mainTr, 'utf8'));
const c = JSON.parse(fs.readFileSync(path.join(A, 'transcript-cta.json'), 'utf8'));
const sh = (x) => Math.round((x + offset) * 1000) / 1000;
t.words = [...t.words, ...c.words.map((w) => ({...w, s: sh(w.s), e: sh(w.e)}))];
t.segments = [...t.segments, ...c.segments.map((s) => ({...s, start: sh(s.start), end: sh(s.end)}))];
t.text = `${t.text} ${c.text}`;
t.duration = Math.round((offset + dCta) * 1000) / 1000;
fs.writeFileSync(path.join(A, 'transcript.json'), JSON.stringify(t, null, 1));

// tomas elegidas del CTA (tiempos del clip CTA)
const ctaSelects = [
  {in: 10.2, out: 12.78, note: 'CTA: Así que sigue a Vocare Iuris y guarda este video'},
  {in: 22.8, out: 24.58, note: 'CTA: No sabes cuándo podrás necesitarlo'},
];
const selFile = path.join(dir, 'selects.json');
const sel = JSON.parse(fs.readFileSync(selFile, 'utf8')).filter((s) => !s.note.startsWith('CTA:'));
for (const s of ctaSelects) sel.push({in: sh(s.in), out: sh(s.out), note: s.note});
fs.writeFileSync(selFile, JSON.stringify(sel, null, 1));
console.log(`✓ transcripción y selects actualizados (offset CTA ${offset.toFixed(3)} s)`);
