#!/usr/bin/env node
/**
 * Plan editorial de video-5 (Impuesto Selectivo al Consumo: el impuesto que no ves).
 * Se aplica sobre el EDL borrador: node projects/video-5/edit-plan.mjs
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

// Subtítulos: palabras duplicadas por el margen de transcripción (p. ej. «combustibles combustibles»)
e.captions = e.captions.filter((c, i, a) => !(i > 0 && norm(c.text) === norm(a[i - 1].text) && norm(c.text).length > 3));
// Subtítulos: correcciones puntuales
for (const c of e.captions) {
  if (norm(c.text) === 'sumiendo') c.text = 'asumiendo';
  if (c.text === 'IGB') c.text = 'IGV';
  if (c.text === 'Sabías') c.text = '¿Sabías';
}
// «Por dos razones»: la transcripción por toma sólo captó «razones» → se reparte su tiempo en 3 palabras
{
  const i = e.captions.findIndex((c) => norm(c.text) === 'razones');
  if (i > 0 && norm(e.captions[i - 1].text) !== 'dos') {
    const c = e.captions[i];
    const end = c.end ?? c.start + 0.8;
    const d = (end - c.start) / 3;
    e.captions.splice(i, 1, {...c, text: 'Por', start: r(c.start), end: r(c.start + d)}, {...c, text: 'dos', start: r(c.start + d), end: r(c.start + 2 * d)}, {...c, text: 'razones', start: r(c.start + 2 * d), end: r(end)});
  }
}

// ── 1. HOOK (frame 0): la cerveza → los cigarros → el impuesto extra → el ticket
const cerv = at('cerveza');
sticker('🍺', 0, at('O').start - 0.03, 0.68, 0.62, 'hook: comprar una cerveza');
sticker('🚬', at('O').start, at('estas').start - at('O').start - 0.03, 0.32, 0.62, '«o alguien compra cigarros»');
sticker('💸', at('estas').start, at('que', at('extra').start).start - at('estas').start - 0.03, 0.68, 0.62, '«un impuesto extra»');
photo('ticket', at('que', at('extra').start).start, at('Se').start - at('que', at('extra').start).start - 0.03, {x: 0.34, y: 0.64, rotate: -4, cw: 400, label: 'Ticket', emoji: '🔎', note: 'objeto: el ticket (sin fondo)'});

// ── 2. Nombre del impuesto (normativa) + no es IGV
const se = at('Se');
add({type: 'lawCard', title: 'ISC', subtitle: 'Impuesto Selectivo al Consumo', footnote: 'TUO de la Ley del IGV e ISC', color: 'yellow', x: 0.5, y: 0.66, start: se.start, end: at('Y').start - 0.03}, 'normativa: nombre del impuesto (verificar cita)');
const noIgv = at('Y');
add({type: 'verdictStamp', text: 'No es IGV', tone: 'deny', x: 0.5, y: 0.6, start: noIgv.start, end: at('Son').start - 0.03}, 'desmentido');
add({type: 'comparison', left: {label: 'IGV', emoji: '💳'}, right: {label: 'ISC', emoji: '🍷'}, x: 0.5, y: 0.64, start: at('Son').start, end: at('El', at('distintos').start).start - 0.03}, '«son dos impuestos distintos»');

// ── 3. IGV vs ISC
const igv = at('El', at('distintos').start);
sticker('💳', igv.start, at('Pero').start - igv.start - 0.03, 0.68, 0.62, 'IGV: casi todo lo que compras');
const pero1 = at('Pero');
sticker('🎯', pero1.start, at('productos', pero1.start).start - pero1.start - 0.05, 0.32, 0.62, 'ISC: productos específicos');
add({type: 'kineticWord', syllables: ['PRODUCTOS', 'ESPECÍFICOS'], layout: 'rows', uppercase: true, stepFrames: 5, x: 0.5, y: 0.6, start: at('productos', pero1.start).start - 0.03, end: at('alcohol').start - 0.03}, 'ruptura: el concepto clave');

// ── 4. Ráfaga de productos (un emoji por palabra)
const prods = [['alcohol', '🍷', 0.32], ['tabaco', '🚬', 0.68], ['combustibles', '⛽', 0.32], ['Algunos', '🚗', 0.68], ['Y', '🎰', 0.32]];
const startsP = prods.map(([w], i) => at(w, i === 4 ? at('vehiculos').start : at('alcohol').start - 0.01).start);
prods.forEach(([w, em, x], i) => sticker(em, startsP[i], (i < 4 ? startsP[i + 1] : at('Por').start) - startsP[i] - 0.03, x, 0.62, `producto gravado: ${w}`));

// ── 5. ¿Por qué? Dos razones
const pq = at('Por');
sticker('❓', pq.start, at('dos', pq.start).start - pq.start - 0.02, 0.68, 0.62, 'pregunta (loop abierto)');
sticker('✌️', at('dos', pq.start).start, at('Recaudacion').start - at('dos', pq.start).start - 0.03, 0.32, 0.62, 'dos razones');
const rec = at('Recaudacion');
sticker('💰', rec.start, at('Y', rec.start).start - rec.start - 0.03, 0.68, 0.62, 'razón 1: recaudación');
const des = at('Y', rec.start);
sticker('📉', des.start, at('Porque').start - des.start - 0.03, 0.32, 0.62, 'razón 2: desincentivar el consumo');
const porque = at('Porque');
sticker('🏥', porque.start, at('o', porque.start).start - porque.start - 0.03, 0.68, 0.62, 'daña la salud');
sticker('🌎', at('o', porque.start).start, at('esa').start - at('o', porque.start).start - 0.03, 0.32, 0.62, 'daña el medio ambiente');
add({type: 'selectionLabel', text: 'Función regulatoria', cursor: true, x: 0.5, y: 0.64, start: at('esa').start, end: at('Pero', at('esa').start).start - 0.03}, 'concepto');

// ── 6. Giro: quién lo paga
const ojo = at('Pero', at('esa').start);
sticker('☝️', ojo.start, at('Legalmente').start - ojo.start - 0.03, 0.68, 0.62, '«pero ojo» (giro)');
const leg = at('Legalmente');
add({type: 'lawCard', title: 'Legalmente', subtitle: 'Lo paga el productor o importador', color: 'white', x: 0.5, y: 0.66, start: leg.start, end: at('productor').start - 0.03}, 'normativa: sujetos del ISC (verificar)');
sticker('🏭', at('productor').start, at('importador').start - at('productor').start - 0.03, 0.32, 0.62, 'productor');
sticker('🚢', at('importador').start, at('Pero', leg.start).start - at('importador').start - 0.03, 0.68, 0.62, 'importador');
const adiv = at('Pero', leg.start);
sticker('🔍', adiv.start, at('Tu', at('asumiendo').start).start - adiv.start - 0.03, 0.32, 0.62, '«adivina quién lo está asumiendo»');
const tu = at('Tu', at('asumiendo').start);
add({type: 'kineticWord', syllables: ['¡TÚ!'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: tu.start, end: at('porque', tu.start).start - 0.02}, 'revelación');
const inc = at('porque', tu.start);
sticker('🏷️', inc.start, at('Asi').start - inc.start - 0.03, 0.68, 0.62, 'va incluido en el precio final');

// ── 7. Cierre en bucle: vuelve a la cerveza
const asi = at('Asi');
sticker('🍻', asi.start, at('Ya').start - asi.start - 0.03, 0.32, 0.62, 'cierre: vuelve a la chela del hook');
const ya = at('Ya');
sticker('🙈', ya.start, at('Hay').start - ya.start - 0.03, 0.68, 0.62, '«ya sabes que ahí…»');
add({type: 'selectionLabel', text: 'Un impuesto que no ves', cursor: false, x: 0.5, y: 0.64, start: at('Hay').start, end: at('Sigue').start - 0.05}, 'cierre: la idea central');

// ── Encuadres: pocos cambios visibles (pedido del equipo: «dinámico pero sin que se noten tantos cortes»).
//    El encuadre sólo cambia cada ~3 planos o en un momento de choque; entre medias se mantiene igual
//    y la cámara empuja suave y continuo (slowPush), así los cortes de limpieza pasan desapercibidos.
const cta = at('Sigue');
const hits = [noIgv.start, pero1.start, tu.start];
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
  const hit = hits.some((x) => x >= t - 0.05 && x < outT);
  if (hit) {
    s.framing = 'punchIn';
    s.move = 'crash';
    sinceChange = 0;
    continue;
  }
  if (sinceChange >= 3) {
    look = (look + 1) % looks.length;
    sinceChange = 0;
  }
  s.framing = looks[look];
  s.move = 'slowPush';
  sinceChange++;
}
e.segments[0].framing = 'subtleIn';
e.segments[0].move = 'settle';

// subtítulos que enganchan: palabras clave más grandes
const KEY = ['impuesto', 'extra', 'ticket', 'selectivo', 'consumo', 'igv', 'isc', 'distintos', 'especificos', 'alcohol', 'tabaco', 'combustibles', 'vehiculos', 'azar', 'razones', 'recaudacion', 'salud', 'ambiente', 'regulatoria', 'legalmente', 'tu', 'precio', 'chela', 'ves'];
for (const c of e.captions) if (c.start < cta.start && KEY.includes(norm(c.text))) c.emphasis = true;

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
// destellos de ruptura de patrón (no recortan recursos)
for (const t of [noIgv.start, tu.start]) overlays.push({type: 'flash', opacity: 0.7, start: r(t - 0.02), end: r(t + 0.16), note: 'ruptura de patrón'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = []; // sin SFX: el equipo los pone en su edición
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos`);
const gaps = [];
const vis = overlays.filter((o) => o.type !== 'flash');
for (let i = 1; i < vis.length; i++) if (vis[i].start - vis[i - 1].end > 2.0) gaps.push(`${vis[i - 1].end}–${vis[i].start}`);
if (gaps.length) console.log('  huecos sin estímulo > 2 s:', gaps.join(', '));
