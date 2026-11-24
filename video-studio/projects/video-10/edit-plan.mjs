#!/usr/bin/env node
/**
 * Plan editorial de video-10 (greenwashing: ¿cuál de las tres botellas es ecológica?).
 * Se aplica sobre el EDL borrador: node projects/video-10/edit-plan.mjs
 *
 * Pedido: cortar silencios, imágenes y emojis, textos de retención y apoyos visuales al hook
 * (Guille Collado), subtítulos con seguimiento facial, todos del mismo tamaño (14 pt).
 * Códigos nativos: hook visual en el frame 0 (las tres botellas numeradas), reto al espectador
 * («escoge una»), revelación por botella con ✗/✓, base legal (publicidad engañosa / Indecopi),
 * cierre en bucle volviendo a las tres botellas. Sin SFX.
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

// Subtítulos: correcciones (lo que dice la presentadora) y TODOS del mismo tamaño (sin énfasis)
const dropCap = (c) => {
  const i = e.captions.indexOf(c);
  if (i > 0) e.captions[i - 1].end = c.end;
  e.captions.splice(i, 1);
};
function S(w, after = 0) {
  return at(w, after).start;
}
{
  // «Verde con hojas» repetido por el margen de la transcripción
  const v2 = at('Verde', S('Verde') + 0.2);
  const i = e.captions.indexOf(v2);
  e.captions[i - 1].end = e.captions[i + 2].end;
  e.captions.splice(i, 3);
}
{
  const nv = e.captions.find((c) => norm(c.text) === 'never');
  if (nv) nv.text = 'nada';
  const le = e.captions.find((c) => norm(c.text) === 'leados');
  if (le) {
    const i = e.captions.indexOf(le);
    const mid = (le.start + le.end) / 2;
    e.captions.splice(i, 1, {...le, text: 'La', end: mid}, {...le, text: 'dos', start: mid});
  }
  dropCap(at('en', S('diseno')));
  dropCap(at('de', S('mentira')));
  at('va', S('Basta')).text = 'haga';
  dropCap(at('a', S('haga')));
  const ind = at('Indecopi');
  const i = e.captions.indexOf(ind);
  e.captions.splice(i, 0, {...ind, text: 'Y', end: ind.start + 0.12});
  ind.start += 0.12;
  at('puedes').text = 'puede';
  const il = at('Ilea');
  il.text = 'Y la';
  at('3', il.start).text = 'tres';
  const esa = at('Esa', S('reciclado'));
  esa.text = 'Es';
  dropCap(at('es', esa.start + 0.01));
}
for (const c of e.captions) c.emphasis = false; // pedido: todos los subtítulos del mismo tamaño
e.captions = e.captions.filter((c, i, a) => !(i > 0 && norm(c.text) === norm(a[i - 1].text) && norm(c.text).length > 3));

const until = (w, after = 0) => S(w, after) - 0.03;
const st = (emoji, t, end, x, note) => sticker(emoji, t, end - t, x, 0.62, note);
const bottles = (t, end, props, note) => add({type: 'bottles', x: 0.5, y: 0.67, ...props, start: t, end}, note);

// ── 1. HOOK VISUAL (frame 0): las tres botellas → «dos te mienten» → reto
const ver = at('veremos');
bottles(0, until('Las'), {w: 190}, 'hook: tres botellas en pantalla');
const mien = at('mintiendo');
add({type: 'kineticWord', syllables: ['DOS', 'MIENTEN'], layout: 'stack', uppercase: true, stepFrames: 3, x: 0.5, y: 0.6, start: S('Las'), end: until('Escoge')}, 'las otras dos te mienten');
bottles(S('Escoge'), until('La'), {w: 190, marks: [null, null, null]}, 'escoge una');
// letrero LED arriba, DETRÁS de la presentadora (pedido del equipo); sin subtítulo encima mientras dura
const ledA = S('Escoge');
const ledB = until('La');
add({type: 'ledSign', text: '¿Cuál es la ecológica?', x: 0.5, y: 0.2, behindPerson: true, start: ledA, end: ledB}, 'reto al espectador (LED)');
e.captions = e.captions.filter((c) => c.start < ledA - 0.05 || c.start >= ledB);

// ── 2. BOTELLA 1: verde con hojas, «amigable con el planeta»
const b1 = at('La');
bottles(b1.start, until('Pero'), {show: [0], w: 250}, 'botella 1');
st('🤥', S('Pero'), until('No', S('Pero')), 0.68, '¿pero por qué?');
bottles(S('No', S('Pero')), until('Eso'), {show: [0], w: 250, marks: ['x']}, 'no dice nada: ✗');

// ── 3. NOMBRE: greenwashing
const eso = at('Eso');
st('🎨', eso.start, until('Greenwashing'), 0.32, 'eso tiene un nombre');
// «GREENWASHING» aparece en amarillo y una brocha lo pinta (mal) de verde
const gw = S('Greenwashing');
const defEnd = until('La', S('Hacer'));
const brushEnd = Math.min(gw + 1.9, defEnd - 1.4);
add({type: 'brushPaint', lines: ['GREEN', 'WASHING'], x: 0.5, y: 0.62, start: gw, end: brushEnd}, 'término + brocha');
// definición como sello de goma tipo «CANCELLED»
add({type: 'rubberStamp', lines: ['Parecer más ecológico', 'de lo que es'], x: 0.5, y: 0.64, start: brushEnd + 0.03, end: defEnd}, 'definición (sello)');

// ── 4. BOTELLA 2: sello verde inventado
const b2 = at('La', S('Hacer'));
bottles(b2.start, until('Y', b2.start), {show: [1], w: 250}, 'botella 2: sello verde');
st('🗯️', S('Y', b2.start), until('Nadie'), 0.68, '¿y quién lo da?');
bottles(S('Nadie'), until('Ojo'), {show: [1], w: 250, marks: [null, 'x']}, 'lo diseñó la misma marca: ✗');

// ── 5. GIRO LEGAL
const ojo = at('Ojo');
add({type: 'textBadge', text: 'No tiene que ser una mentira directa', x: 0.5, y: 0.64, start: ojo.start, end: until('Basta')}, 'ojo');
st('👁️', S('Basta'), until('En'), 0.32, 'basta con hacerte creer algo');
add({type: 'lawCard', title: 'Publicidad engañosa', subtitle: 'D. Leg. 1044 · Actos de engaño', color: 'yellow', x: 0.5, y: 0.66, start: S('En'), end: until('Y', S('engañosa'))}, 'normativa (verificar cita)');
const ind = at('Y', S('engañosa'));
add({type: 'verdictStamp', text: 'Indecopi sanciona', tone: 'deny', x: 0.5, y: 0.6, start: ind.start, end: until('Y la')}, 'Indecopi puede sancionarlo');

// ── 6. BOTELLA 3: la específica
const b3 = at('Y la');
bottles(b3.start, until('Es', S('reciclado')), {show: [2], w: 250}, 'botella 3: 50 % reciclado');
bottles(S('Es', S('reciclado')), until('tu'), {show: [2], w: 250, marks: [null, null, 'check']}, 'específica y comprobable: ✓');

// ── 7. CIERRE EN BUCLE + pregunta a comentarios
const yt = at('tu');
bottles(yt.start, e.captions[e.captions.length - 1].end, {w: 170, marks: ['x', 'x', 'check']}, 'cierre en bucle');
sticker('💬', S('Dimelo'), e.captions[e.captions.length - 1].end - S('Dimelo'), 0.5, 0.88, 'dímelo en los comentarios');

// ── Encuadres: cambio cada ~5 s; crash sólo en los choques
const hits = [mien.start - 0.8, S('Greenwashing'), ind.start];
const looks = ['subtleIn', 'base', 'subtleIn', 'punchIn'];
let look = 0;
let sinceChange = 0;
let outT = 0;
for (const s of e.segments) {
  const t = outT;
  outT += s.out - s.in;
  if (hits.some((x) => x >= t - 0.05 && x < outT)) {
    s.framing = 'punchIn';
    s.move = 'crash';
    sinceChange = 0;
    continue;
  }
  if (sinceChange >= 5) {
    look = (look + 1) % looks.length;
    sinceChange = 0;
  }
  s.framing = looks[look];
  s.move = 'slowPush';
  sinceChange += s.out - s.in;
}
e.segments[0].framing = 'subtleIn';
e.segments[0].move = 'settle';

overlays.sort((a, b) => a.start - b.start);
for (const t of [S('Las'), S('Greenwashing'), ind.start]) overlays.push({type: 'flash', opacity: 0.6, start: r(t - 0.02), end: r(t + 0.16), note: 'ruptura de patrón'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = []; // sin SFX: el equipo los pone en su edición
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos`);
const bad = overlays.filter((o) => o.end <= o.start);
if (bad.length) console.log('  ⚠️ recursos con tiempos inválidos:', bad.map((o) => o.note).join(', '));
