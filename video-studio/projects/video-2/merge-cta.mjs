#!/usr/bin/env node
/**
 * Une el clip del CTA (grabado aparte) al final del material principal de video-2, sin
 * recodificar (mismos parámetros de proxy), y desplaza su transcripción y sus tomas elegidas.
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

const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', f], {encoding: 'utf8'}).trim());
const offset = dur(main);
const list = path.join(pub, 'concat.txt');
fs.writeFileSync(list, `file '${main}'\nfile '${cta}'\n`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
fs.rmSync(list);
console.log(`✓ source.mp4 = principal (${offset.toFixed(3)} s) + CTA (${dur(cta).toFixed(3)} s)`);

const A = path.join(dir, 'analysis');
const mainTr = path.join(A, 'transcript-main.json');
if (!fs.existsSync(mainTr)) fs.copyFileSync(path.join(A, 'transcript.json'), mainTr);
const t = JSON.parse(fs.readFileSync(mainTr, 'utf8'));
const c = JSON.parse(fs.readFileSync(path.join(A, 'transcript-cta.json'), 'utf8'));
const sh = (x) => Math.round((x + offset) * 1000) / 1000;
t.words = [...t.words, ...c.words.map((w) => ({...w, s: sh(w.s), e: sh(w.e)}))];
t.segments = [...t.segments, ...c.segments.map((s) => ({...s, start: sh(s.start), end: sh(s.end)}))];
t.text = `${t.text} ${c.text}`;
t.duration = Math.round((offset + c.duration) * 1000) / 1000;
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
