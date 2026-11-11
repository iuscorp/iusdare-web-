#!/usr/bin/env node
/**
 * Plan editorial de video-4 (¿el colegio puede prohibirte maquillarte o pintarte el cabello?).
 * Se aplica sobre el EDL borrador: node projects/video-4/edit-plan.mjs
 *
 * Códigos nativos (documentation/05-codigos-nativos.md):
 *  - Hook con foto en el frame 0 + desmentido inmediato «FALSO» (sello) en < 3.5 s.
 *  - Build Up con prueba visual: art. 51 (supremacía) y art. 2.1 (libre desarrollo) impresos
 *    con resaltador sincronizado.
 *  - Loop abierto: la objeción del público («pero mis papás firmaron») → respuesta con sello.
 *  - Estímulo cada ≤ 2.5 s alternando foto / norma / tarjeta / emoji / sello y lado.
 *  - Encuadre distinto en cada plano; CTA limpio.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const slug = path.basename(dir);
const f = path.join(dir, 'edl.json');
const e = JSON.parse(fs.readFileSync(f, 'utf8'));
const PUB = path.join(dir, '..', '..', 'public');
const credits = fs.existsSync(path.join(dir, 'photo-credits.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'photo-credits.json'), 'utf8')) : {};
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const at = (word, after = 0) => {
  const c = e.captions.find((x) => norm(x.text) === norm(word) && x.start >= after);
  if (!c) throw new Error(`palabra no encontrada: ${word} (después de ${after})`);
  return c;
};
const r = (x) => Math.round(x * 1000) / 1000;
const overlays = [];
const sfx = [];
const add = (o, note) => overlays.push({...o, start: r(o.start), end: r(o.end), note});
const fx = (name, t, volumeDb = -16) => sfx.push({name, at: r(Math.max(0, t)), volumeDb});
const sticker = (emoji, t, dur, x, y = 0.62, note = '') => {
  add({type: 'sticker', emoji, size: 175, x, y, start: t, end: t + dur}, note);
  fx('pop', t, -10);
};
const photo = (name, t, dur, {x = 0.5, y = 0.64, w = 500, h = 380, rotate = -3, label, emoji, note, cw}) => {
  const dirRel = `footage/${path.basename(dir)}/photos`;
  const png = `${dirRel}/${name}.png`;
  const jpg = `${dirRel}/${name}.jpg`;
  if (fs.existsSync(path.join(PUB, png))) {
    // foto SIN FONDO (scripts/cutout.py): estilo sticker
    add({type: 'cutout', image: png, x, y, w: cw ?? 430, rotate, label, credit: credits[name]?.credit, start: t, end: t + dur}, note);
    fx('pop', t - 0.02, -10);
    fx('whoosh', t - 0.08, -15);
  } else if (fs.existsSync(path.join(PUB, jpg))) {
    add({type: 'photoCard', image: jpg, x, y, w, h, rotate, label, credit: credits[name]?.credit, start: t, end: t + dur}, note);
    fx('shutter', t - 0.02, -9);
    fx('whoosh', t - 0.08, -15);
  } else if (emoji) sticker(emoji, t, dur, x, 0.62, `${note} (sin foto: emoji)`);
};

// Ortografía de subtítulos
for (const c of e.captions) {
  if (norm(c.text) === 'prohiben') c.text = 'prohíben';
  if (c.text === 'constitución') c.text = 'Constitución';
}
const ind = at('Indecopi');
const si = [...e.captions].reverse().find((c) => c.start < ind.start && norm(c.text) === 'si');
if (si) si.text = 'sí';

// ── 1. HOOK: emoji en el frame 0 → el reglamento (norma: imagen sin fondo) → desmentido
sticker('💄', 0, at('reglamento').start - 0.08, 0.66, 0.62, 'hook: maquillarse');
photo('reglamento', at('reglamento').start - 0.05, at('Eso').start - at('reglamento').start, {x: 0.34, y: 0.64, rotate: -6, cw: 300, label: 'Reglamento', emoji: '📋', note: 'norma: el reglamento del colegio (objeto sin fondo)'});
const falso = at('falso');
add({type: 'verdictStamp', text: 'Falso', tone: 'deny', x: 0.5, y: 0.6, start: at('Eso').start, end: at('Ni').start + 0.35}, 'desmentido inmediato (antihook)');
fx('riser', at('Eso').start - 1.6, -14);
fx('hit', at('Eso').start, -7);
fx('stamp', at('Eso').start, -9);

// ── 2. Ni el reglamento ni lo que firmaron tus papás
const ni2 = at('ni', at('colegio', 4).start);
photo('aula', at('reglamento', 3.9).start - 0.1, ni2.start - at('reglamento', 3.9).start + 0.05, {x: 0.34, y: 0.64, w: 460, h: 340, rotate: -3, label: 'El colegio', emoji: '🏫', note: 'lugar: el colegio (foto con fondo)'});
sticker('👫', ni2.start, at('matricula').start - ni2.start - 0.03, 0.68, 0.62, 'los papás');
sticker('🗂️', at('matricula').start - 0.03, at('estan').start - at('matricula').start, 0.32, 0.62, 'la matrícula');
sticker('🔝', at('estan').start, at('Porque').start - at('estan').start, 0.68, 0.62, '«no están por encima de la Constitución»');

// ── 3. Supremacía constitucional → art. 51 impreso
const sup = at('supremacia');
add({type: 'selectionLabel', text: 'Supremacía constitucional', cursor: true, x: 0.5, y: 0.64, start: sup.start - 0.15, end: at('Eso', sup.start).start - 0.05}, 'término clave');
fx('click', sup.start - 0.1, -10);
fx('ding', sup.start + 0.2, -16);
const quiere = at('Eso', sup.start);
const cons = at('Constitucion', quiere.start);
add(
  {
    type: 'lawPage',
    source: 'Constitución Política del Perú',
    heading: 'Artículo 51',
    body: '**La Constitución prevalece sobre toda norma legal**; la ley, sobre las normas de inferior jerarquía, y así sucesivamente.',
    highlightAt: [cons.start - quiere.start],
    x: 0.5,
    y: 0.69,
    start: quiere.start,
    end: at('Ninguna').start - 0.04,
  },
  'base legal: supremacía (art. 51)',
);
fx('swish', quiere.start - 0.02, -11);
fx('type', quiere.start + 0.1, -12);
fx('click', cons.start, -12);
const ning = at('Ninguna');
add({type: 'kineticWord', syllables: ['NINGUNA', 'NORMA'], layout: 'rows', uppercase: true, stepFrames: 5, x: 0.5, y: 0.6, start: ning.start, end: at('mucho').start - 0.03}, 'pattern interrupt: «ninguna norma»');
fx('drop', ning.start, -8);
fx('whoosh', ning.start - 0.05, -12);
fx('pop', at('norma', ning.start).start, -11);
const reg3 = at('reglamento', ning.start);
add({type: 'denyMark', x: 0.3, y: 0.62, start: reg3.start - 0.15, end: at('Pero').start - 0.05}, '«un reglamento interno no puede contradecirla»');
fx('poi', reg3.start - 0.15, -10);

// ── 4. Loop abierto: la objeción del público
const pero = at('Pero');
fx('scratch', pero.start - 0.05, -8);
sticker('✋', pero.start, at('Bueno').start - pero.start, 0.7, 0.62, 'objeción: «pero mis papás firmaron»');
const bueno = at('Bueno');
sticker('✍️', bueno.start, at('no', bueno.start).start - bueno.start - 0.05, 0.3, 0.62, '«sí, firmaron»');
const noVal = at('no', bueno.start);
add({type: 'verdictStamp', text: 'No es válido', tone: 'deny', x: 0.5, y: 0.6, start: noVal.start, end: at('renuncia').start - 0.03}, 'respuesta a la objeción');
fx('hit', noVal.start, -8);
fx('stamp', noVal.start, -9);
add({type: 'selectionLabel', text: 'Derechos fundamentales', cursor: true, x: 0.5, y: 0.64, start: at('renuncia').start, end: at('Asi', noVal.start).start - 0.05}, 'no se puede renunciar a ellos');
fx('click', at('renuncia').start, -10);

// ── 5. Ráfaga de emojis: entrar al colegio / cabello pintado / maquillaje → el reglamento (imagen)
const asi = at('Asi', noVal.start);
const cab = at('cabello');
const maq = at('maquillaje', cab.start);
sticker('🚷', at('prohiben').start - 0.05, cab.start - at('prohiben').start - 0.1, 0.32, 0.62, '«si te prohíben entrar al colegio»');
sticker('🎨', cab.start - 0.06, maq.start - cab.start + 0.03, 0.5, 0.62, 'cabello pintado');
sticker('💋', maq.start - 0.03, at('y', maq.start).start - maq.start + 0.1, 0.68, 0.62, 'maquillaje');
const dicen = at('dicen', maq.start);
photo('reglamento', dicen.start - 0.05, at('sigue', dicen.start).start - dicen.start - 0.05, {x: 0.66, y: 0.64, rotate: 6, cw: 300, label: '«Está en el reglamento»', emoji: '📋', note: 'norma citada por el colegio'});

// ── 6. Libre desarrollo de la personalidad (art. 2.1 impreso)
const sigue = at('sigue', dicen.start);
const libre = at('libre', sigue.start);
add(
  {
    type: 'lawPage',
    source: 'Constitución Política del Perú',
    heading: 'Artículo 2, inciso 1',
    body: 'Toda persona tiene derecho: A la vida, a su identidad, a su integridad moral, psíquica y física y **a su libre desarrollo y bienestar**.',
    highlightAt: [libre.start - (sigue.start - 0.05)],
    x: 0.5,
    y: 0.69,
    start: sigue.start - 0.05,
    end: ind.start - 0.25,
  },
  'base legal: libre desarrollo de la personalidad (art. 2.1)',
);
fx('swish', sigue.start - 0.07, -11);
fx('type', sigue.start + 0.05, -12);
fx('click', libre.start, -12);
fx('ding', libre.start + 0.15, -17);

// ── 7. Indecopi + matiz
add({type: 'lawCard', title: 'INDECOPI', subtitle: 'Ya lo dejó claro', color: 'yellow', x: 0.5, y: 0.66, start: ind.start - 0.2, end: at('colegios', ind.start).start - 0.03}, 'autoridad (verificar pronunciamiento)');
fx('kiran', ind.start - 0.2, -11);
fx('type', ind.start - 0.1, -14);
const col = at('colegios', ind.start);
sticker('👔', col.start, at('siempre').start - col.start - 0.03, 0.7, 0.62, 'sí pueden tener reglas de presentación (uniforme, presentación)');
const siem = at('siempre');
sticker('⛔', siem.start, at('asi', siem.start).start - siem.start - 0.03, 0.3, 0.62, 'límite: no vulnerar derechos');

// ── 8. Cierre en bucle
const cierre = at('asi', siem.start);
add({type: 'comparison', left: {label: 'Reglamento', emoji: '📋'}, right: {label: 'Constitución', emoji: '📜'}, x: 0.5, y: 0.64, start: at('reglamento', cierre.start).start, end: at('no', cierre.start).start - 0.03}, 'el reglamento se adapta a la Constitución');
fx('whoosh', at('reglamento', cierre.start).start - 0.05, -11);
const no2 = at('no', cierre.start);
add({type: 'selectionLabel', text: 'La Constitución manda', cursor: false, x: 0.5, y: 0.64, start: no2.start, end: at('sigue', no2.start).start - 0.05}, 'cierre: vuelve al concepto');
fx('kiran', no2.start, -11);
fx('boom', no2.start, -12);

// ── Encuadres por plano; CTA en base
const cta = at('sigue', no2.start);
const pattern = ['subtleIn', 'base', 'punchIn', 'subtleIn', 'base', 'subtleIn'];
let k = 0;
let outT = 0;
for (const s of e.segments) {
  const t = outT;
  outT += s.out - s.in;
  s.move = 'none';
  if (t >= cta.start - 0.1) {
    s.framing = 'base';
    continue;
  }
  s.framing = pattern[k++ % pattern.length];
  s.move = 'snap'; // cada corte entra con golpe de zoom y sigue en movimiento
  // crash zoom en los momentos de choque (veredicto / ruptura)
  const tEnd = outT;
  if ([at('Eso').start, ning.start, noVal.start].some((x) => x >= t - 0.05 && x < tEnd)) {
    s.framing = 'punchIn';
    s.move = 'crash';
  }
  // tic de corte (ritmo sonoro) si no hay otro SFX encima
  if (t > 0.2 && !sfx.some((x) => Math.abs(x.at - t) < 0.2)) fx('snap', t - 0.01, -17);
}
e.segments[0].framing = 'subtleIn';
e.segments[0].move = 'settle';
fx('whoosh', 0, -12);

// subtítulos que enganchan: palabras clave más grandes
const KEY = ['falso', 'constitucion', 'supremacia', 'constitucional', 'ninguna', 'norma', 'valido', 'derechos', 'fundamentales', 'libre', 'personalidad', 'indecopi', 'prohiben', 'maquillaje', 'maquillarte', 'reglamento'];
for (const c of e.captions) if (c.start < cta.start && KEY.includes(norm(c.text))) c.emphasis = true;

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
// destellos de ruptura de patrón en los cambios de bloque (no recortan los recursos)
for (const t of [at('Eso').start, pero.start, at('reglamento', cierre.start).start]) overlays.push({type: 'flash', opacity: 0.7, start: r(t - 0.02), end: r(t + 0.16), note: 'ruptura de patrón'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = sfx.sort((a, b) => a.at - b.at);
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos (${overlays.filter((o) => o.type === 'photoCard').length} fotos, ${overlays.filter((o) => o.type === 'lawPage').length} normas impresas), ${sfx.length} SFX`);
const gaps = [];
for (let i = 1; i < overlays.length; i++) if (overlays[i].start - overlays[i - 1].end > 2.5) gaps.push(`${overlays[i - 1].end}–${overlays[i].start}`);
if (gaps.length) console.log('  huecos sin estímulo > 2.5 s:', gaps.join(', '));
