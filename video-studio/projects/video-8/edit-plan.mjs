#!/usr/bin/env node
/**
 * Plan editorial de video-8 (marca inactiva: cancelación por falta de uso / nulidad).
 * Se aplica sobre el EDL borrador: node projects/video-8/edit-plan.mjs
 *
 * Códigos nativos (documentation/05-codigos-nativos.md):
 *  - Hook provocador «¿Te gusta una marca inactiva?» → «¡RÓBATELA!» (choque) → sello «Totalmente válido».
 *  - Estructura en 4 pasos con etiqueta por paso; base legal con tarjetas (Decisión 486, Indecopi).
 *  - Emojis nuevos a 160 px; sin SFX; encuadre cada ~5 s; CTA limpio.
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

// Subtítulos: correcciones (lo que dice la presentadora)
const seq = (from, texts) => {
  // reemplaza las palabras desde la caption `from` con `texts` (mismo número o menos: se fusionan tiempos)
  const i = e.captions.indexOf(from);
  const n = texts.length;
  for (let k = 0; k < n; k++) e.captions[i + k].text = texts[k];
};
const dropCap = (c) => {
  const i = e.captions.indexOf(c);
  if (i > 0) e.captions[i - 1].end = c.end;
  e.captions.splice(i, 1);
};
const fix = {usarlo: 'usarla', valido: 'válido', este: 'está', titulo: 'titular', quien: 'quien', avion: 'vía', fundamentandola: 'fundamentando', causar: 'causal', iuri: 'Iuris'};
for (const c of e.captions) {
  const k = norm(c.text);
  if (fix[k]) c.text = fix[k];
}
{
  // «tres a los consecutivos y no se hace» → «tres años consecutivos sin usarse»
  // «fundamentando a causal» → «fundamentando la causal»
  at('a', S('fundamentando')).text = 'la';
  // «que se comercializan» → «que sí comercializan»
  at('se', S('boletas')).text = 'sí';
  // «siga Vocare» → «sigue a Vocare»
  at('siga').text = 'sigue a';
  // «declarando» suelto al final de la toma (la frase sigue en la toma siguiente)
  const d1 = at('declarando');
  const d2 = e.captions[e.captions.indexOf(d1) + 1];
  if (d2 && norm(d2.text) === 'declarando') {
    d2.start = d1.start;
    e.captions.splice(e.captions.indexOf(d1), 1);
  }
}

function S(w, after = 0) {
  return at(w, after).start;
}
const until = (w, after = 0) => S(w, after) - 0.03;
const st = (emoji, t, end, x, note) => sticker(emoji, t, end - t, x, 0.62, note);
const label = (text, t, end, note) => add({type: 'selectionLabel', text, cursor: true, x: 0.5, y: 0.64, start: t - 0.05, end}, note);

// ── 1. HOOK
st('💤', 0, until('negocio'), 0.68, 'marca inactiva');
st('🏪', S('negocio'), until('Pues'), 0.32, 'para tu negocio');
const rob = at('Pues');
add({type: 'kineticWord', syllables: ['¡RÓBATELA!'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: rob.start, end: until('Es')}, 'choque');
const val = at('Es');
add({type: 'verdictStamp', text: 'Totalmente válido', tone: 'ok', x: 0.5, y: 0.6, start: val.start, end: until('Si')}, 'es legal (vía cancelación / nulidad)');
st('👻', S('Si'), until('afecta'), 0.68, 'marca que no está en uso');
st('🏷️', S('afecta'), until('Tienes'), 0.32, 'afecta el registro de tu marca');
st('🗑️', S('Tienes'), until('La'), 0.68, 'exigir su eliminación');
st('🛣️', S('La'), until('Paso'), 0.32, 'la vía legal que elijas');

// ── 2. PASO 1: la causal
const p1 = at('Paso');
label('Paso 1 · Identifica la causal', p1.start, until('Si', p1.start), 'paso 1');
st('🕰️', S('Si', p1.start), until('Inicias'), 0.68, 'más de tres años sin usarse');
add({type: 'lawCard', title: 'Decisión 486', subtitle: 'Art. 165 · Cancelación por falta de uso', color: 'yellow', x: 0.5, y: 0.66, start: S('Inicias'), end: until('Si', S('Inicias'))}, 'normativa (CAN)');
st('⚔️', S('Si', S('Inicias')), until('Solicitas'), 0.32, 'vulnerando la ley o derechos de terceros');
st('🚫', S('Solicitas'), until('Paso', S('Solicitas')), 0.68, 'nulidad del registro');

// ── 3. PASO 2: solicitud ante Indecopi
const p2 = at('Paso', S('Solicitas'));
label('Paso 2 · Presenta tu solicitud', p2.start, until('Interpone'), 'paso 2');
st('🏢', S('Interpone'), until('Como'), 0.32, 'la autoridad competente');
add({type: 'lawCard', title: 'Indecopi', subtitle: 'Dirección de Signos Distintivos', color: 'white', x: 0.5, y: 0.66, start: S('Como'), end: until('fundamentando')}, 'autoridad');
st('📑', S('fundamentando'), until('Y', S('fundamentando')), 0.68, 'fundamentando la causal');
st('💲', S('pagando'), until('Paso', S('pagando')), 0.32, 'pagando la tasa');

// ── 4. PASO 3: notificación y carga de la prueba
const p3 = at('Paso', S('pagando'));
label('Paso 3 · Notificación y prueba', p3.start, until('La', p3.start), 'paso 3');
st('📬', S('La', p3.start), until('Pero'), 0.68, 'notifica al titular');
const ojo = at('Pero');
add({type: 'kineticWord', syllables: ['¡OJO!'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: ojo.start, end: until('En', ojo.start)}, 'alerta');
add({type: 'lawCard', title: 'Art. 167', subtitle: 'La prueba del uso corre a cargo del titular', color: 'yellow', x: 0.5, y: 0.66, start: S('En', ojo.start), end: until('quien')}, 'Decisión 486: carga de la prueba (no uso)');
st('📊', S('quien'), until('Paso', S('quien')), 0.32, 'facturas o boletas que prueben ventas');

// ── 5. PASO 4: resolución
const p4 = at('Paso', S('quien'));
label('Paso 4 · Resolución final', p4.start, until('Si', p4.start), 'paso 4');
st('🕳️', S('Si', p4.start), until('O', p4.start), 0.68, 'no prueba el uso real');
st('😈', S('O', p4.start), until('La', S('ilegalidad')), 0.32, 'o se confirma la ilegalidad');
st('🔨', S('La', S('ilegalidad')), until('declarando'), 0.68, 'la autoridad resuelve');
const ext = at('declarando');
add({type: 'verdictStamp', text: 'Registro extinguido', tone: 'deny', x: 0.5, y: 0.6, start: ext.start, end: until('En', ext.start)}, 'extinción del registro');
const tu = at('Tu', ext.start);
st('📌', S('En', ext.start), tu.start - 0.03, 0.32, 'en la cancelación por no uso');
add({type: 'lawCard', title: 'Derecho preferente', subtitle: 'Art. 168 · Decisión 486', color: 'white', x: 0.5, y: 0.66, start: tu.start, end: until('La', tu.start)}, 'registrar la marca a tu nombre');

// ── 6. Cierre
st('😎', S('La', tu.start), until('Entre'), 0.68, 'estrategia clara');
st('📂', S('Entre'), until('Ya'), 0.32, 'vía administrativa + pruebas');

// ── Encuadres: cambio cada ~5 s; crash sólo en los choques; CTA en base
const cta = at('Ya');
const hits = [rob.start, ojo.start, ext.start];
const looks = ['subtleIn', 'base', 'subtleIn', 'punchIn'];
let look = 0;
let sinceChange = 0;
let outT = 0;
for (const s of e.segments) {
  const t = outT;
  outT += s.out - s.in;
  if (t >= cta.start - 0.1) {
    s.framing = 'base';
    s.move = 'none';
    continue;
  }
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

const KEY = ['inactiva', 'negocio', 'robatela', 'valido', 'uso', 'eliminacion', 'causal', 'anos', 'cancelacion', 'terceros', 'nulidad', 'solicitud', 'competente', 'indecopi', 'tasa', 'notificacion', 'ojo', 'prueba', 'titular', 'facturas', 'boletas', 'ilegalidad', 'extincion', 'preferente', 'nombre', 'clara', 'pruebas'];
for (const c of e.captions) if (c.start < cta.start && KEY.includes(norm(c.text))) c.emphasis = true;

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
for (const t of [rob.start, ojo.start]) overlays.push({type: 'flash', opacity: 0.7, start: r(t - 0.02), end: r(t + 0.16), note: 'ruptura de patrón'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = []; // sin SFX: el equipo los pone en su edición
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos`);
const bad = overlays.filter((o) => o.end <= o.start);
if (bad.length) console.log('  ⚠️ recursos con tiempos inválidos:', bad.map((o) => o.note).join(', '));
