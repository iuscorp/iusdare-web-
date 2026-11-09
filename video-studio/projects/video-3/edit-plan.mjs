#!/usr/bin/env node
/**
 * Plan editorial de video-3 (discriminación en locales, trabajo y consumo).
 * Se aplica sobre el EDL borrador: node projects/video-3/edit-plan.mjs
 *
 * Códigos nativos aplicados (documentation/05-codigos-nativos.md):
 *  - Reveal/hook en < 3 s con estímulo en el frame 0 (foto de la puerta del local).
 *  - Build Up con PRUEBA VISUAL: la norma impresa en pantalla (lawPage) con resaltador
 *    sobre la frase exacta que dice el presentador → el público VE la ley.
 *  - Estímulo nuevo cada ≤ 2.5 s, alternando tipo (foto / norma / tarjeta / emoji / sello)
 *    y lado (izq./der.) para que el ojo se mueva; nunca dos grandes a la vez.
 *  - Ruptura de patrón: «pero hay más» (palabra cinética + crash), ráfaga de 3 fotos
 *    restaurante/hotel/discoteca, sellos de impacto «2 A 3 AÑOS» y «CLAUSURADO».
 *  - Encuadre que cambia en cada plano (base / subtleIn / punchIn) = microcortes con ritmo.
 *  - CTA limpio: nada encima.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
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
  fx('pop', t, -16);
};
/** foto de ejemplo si existe; si no, emoji de respaldo */
const photo = (name, t, dur, {x = 0.5, y = 0.64, w = 520, h = 400, rotate = -3, label, emoji, note}) => {
  const rel = `footage/video-3/photos/${name}.jpg`;
  if (fs.existsSync(path.join(PUB, rel))) {
    add({type: 'photoCard', image: rel, x, y, w, h, rotate, label, credit: credits[name]?.credit, start: t, end: t + dur}, note);
    fx('whoosh', t - 0.06, -19);
  } else if (emoji) sticker(emoji, t, dur, x, 0.62, `${note} (sin foto: emoji)`);
};

// Corrección de transcripción: «Indecopi puede multarlos» (Whisper: «in the copy, pueden»)
const ind = at('Indecopi');
const pu = e.captions.find((c) => c.start > ind.start && norm(c.text) === 'pueden');
if (pu) pu.text = 'puede';

// ── 1. HOOK (0–6 s): situación cotidiana, estímulo en el frame 0
photo('entrada', 0, 2.05, {x: 0.5, y: 0.66, label: '¿Tú no entras?', emoji: '🚪', note: 'hook: la puerta del local (frame 0)'});
const noEntra = at('no', at('quien', 2).start);
add({type: 'denyMark', x: 0.3, y: 0.62, start: noEntra.start - 0.1, end: noEntra.start + 1.05}, 'exclusión: «quién no entra»');
fx('poi', noEntra.start - 0.1, -15);
const gen = at('genero');
sticker('🚻', at('basandose').start - 0.1, gen.start + 0.45 - at('basandose').start, 0.7, 0.62, 'motivo: género');

// ── 2. BUILD UP: Constitución (norma impresa + resaltador)
const cons = at('Constitucion');
const nadie = at('nadie', cons.start);
const cual = at('cualquier', cons.start);
add(
  {
    type: 'lawPage',
    source: 'Constitución Política del Perú',
    heading: 'Artículo 2, inciso 2',
    body: 'Toda persona tiene derecho a la igualdad ante la ley. **Nadie debe ser discriminado** por motivo de origen, raza, sexo, idioma, religión, opinión, condición económica **o de cualquiera otra índole**.',
    highlightAt: [nadie.start - (cons.start - 0.12) , cual.start - (cons.start - 0.12)],
    x: 0.5,
    y: 0.69,
    start: cons.start - 0.12,
    end: at('El', cual.start).start - 0.06,
  },
  'base legal 1: el texto literal (prueba visual)',
);
fx('swish', cons.start - 0.14, -15);
fx('click', nadie.start, -17);
fx('click', cual.start, -17);

// ── 3. TC + «te incluye a ti»
const tc = at('Tribunal');
add({type: 'lawCard', title: 'TC', subtitle: 'Tribunal Constitucional', color: 'white', x: 0.5, y: 0.66, start: tc.start - 0.05, end: at('te', tc.start).start - 0.05}, 'institución que lo confirma');
fx('type', tc.start, -16);
const ti = at('te', tc.start);
sticker('🫵', ti.start, at('pero', ti.start).start - ti.start, 0.68, 0.62, 'interpela al espectador');

// ── 4. Ruptura de patrón: «pero hay más»
const mas = at('pero', ti.start);
add({type: 'kineticWord', syllables: ['HAY', 'MÁS'], layout: 'line', uppercase: true, stepFrames: 4, x: 0.5, y: 0.6, start: mas.start + 0.15, end: at('El', mas.start).start - 0.03}, 'pattern interrupt: abre el segundo bloque');
fx('whoosh', mas.start + 0.12, -15);

// ── 5. Código Penal art. 323 (norma impresa) → cárcel → sello de pena
const art = at('articulo');
const ori = at('orientacion', art.start);
const quien = at('quien', art.start);
add(
  {
    type: 'lawPage',
    source: 'Código Penal',
    heading: 'Artículo 323.- Discriminación',
    body: 'El que, por sí o mediante terceros, realiza actos de distinción, exclusión, restricción o preferencia… basados en motivos de… sexo, **orientación sexual, identidad de género**… o cualquier otro motivo, será reprimido con pena privativa de libertad…',
    highlightAt: [ori.start - (art.start - 0.1)],
    x: 0.5,
    y: 0.69,
    start: art.start - 0.1,
    end: quien.start - 0.08,
  },
  'base legal 2: el artículo dice textualmente «orientación sexual e identidad de género» (verificar texto vigente)',
);
fx('swish', art.start - 0.12, -15);
fx('click', ori.start, -17);
photo('prision', quien.start, at('entre', quien.start).start - quien.start - 0.05, {x: 0.5, y: 0.66, w: 500, h: 380, rotate: 3, label: 'Puede ir preso', emoji: '👮', note: 'consecuencia: cárcel'});
const entre = at('entre', quien.start);
add({type: 'verdictStamp', text: '2 a 3 años', tone: 'deny', x: 0.5, y: 0.6, start: entre.start, end: at('Y', entre.start).start - 0.02}, 'pena (art. 323 CP: no menor de 2 ni mayor de 3 años)');
fx('riser', entre.start - 1.5, -22);
fx('stamp', entre.start, -11);

// ── 6. Trabajo: foto + las dos leyes
const trab = at('trabajo');
photo('trabajo', at('Y', entre.start).start, at('leyes', trab.start).start - at('Y', entre.start).start + 0.25, {x: 0.66, y: 0.64, w: 460, h: 360, rotate: -4, label: 'En el trabajo', emoji: '💼', note: 'ámbito laboral'});
const l1 = at('26772');
const l2 = at('30709');
add({type: 'lawCard', title: 'Ley N.° 26772', subtitle: 'Ofertas de empleo sin discriminación', color: 'white', x: 0.5, y: 0.66, start: l1.start - 0.05, end: l2.start - 0.25}, 'base legal 3 (acceso al empleo)');
fx('type', l1.start - 0.05, -16);
add({type: 'lawCard', title: 'Ley N.° 30709', subtitle: 'Prohíbe pagar menos por ser mujer u hombre', color: 'yellow', x: 0.5, y: 0.66, start: l2.start - 0.2, end: at('descarten').start - 0.05}, 'base legal 4 (discriminación remunerativa) — confirmar el número que se dice en cámara');
fx('type', l2.start - 0.2, -16);
const desc = at('descarten');
add({type: 'denyMark', x: 0.3, y: 0.62, start: desc.start - 0.1, end: at('paguen').start - 0.05}, '«que te descarten»');
fx('poi', desc.start - 0.1, -15);
sticker('💸', at('paguen').start - 0.05, at('restaurante').start - at('paguen').start - 0.1, 0.7, 0.62, '«o te paguen menos»');

// ── 7. Ráfaga de 3 fotos: restaurante / hotel / discoteca (un estímulo por palabra)
const rest = at('restaurante');
const hot = at('hotel', rest.start);
const disc = at('discoteca', rest.start);
photo('restaurante', rest.start - 0.08, hot.start - rest.start, {x: 0.32, y: 0.64, w: 440, h: 340, rotate: -5, label: 'Restaurante', emoji: '🍽️', note: 'ráfaga 1/3'});
photo('hotel', hot.start - 0.06, disc.start - hot.start, {x: 0.68, y: 0.64, w: 440, h: 340, rotate: 4, label: 'Hotel', emoji: '🏨', note: 'ráfaga 2/3'});
photo('discoteca', disc.start - 0.06, ind.start - disc.start, {x: 0.36, y: 0.64, w: 440, h: 340, rotate: -3, label: 'Discoteca', emoji: '🪩', note: 'ráfaga 3/3'});

// ── 8. Indecopi multa
add({type: 'lawCard', title: 'INDECOPI', subtitle: 'Puede multar al local', color: 'yellow', x: 0.5, y: 0.66, start: ind.start - 0.05, end: at('Aparte').start - 0.04}, 'autoridad de consumo: sanción');
fx('kiran', ind.start - 0.05, -16);

// ── 9. Municipios → sello CLAUSURADO
const mun = at('1500');
add({type: 'selectionLabel', text: '+1500 municipios', cursor: true, x: 0.5, y: 0.64, start: mun.start - 0.2, end: at('clausuran').start - 0.08}, 'dato (verificar cifra con el equipo)');
fx('click', mun.start - 0.15, -14);
const cla = at('clausuran');
add({type: 'verdictStamp', text: 'Clausurado', tone: 'deny', x: 0.5, y: 0.6, start: cla.start, end: at('Tienes').start - 0.03}, 'consecuencia: clausura del negocio');
fx('stamp', cla.start, -11);
fx('fahhh', cla.start + 0.12, -18);

// ── 10. Cierre: «Tienes derechos, hazlos valer»
const tie = at('Tienes');
sticker('💪', tie.start, at('Sigue').start - tie.start - 0.08, 0.7, 0.62, 'empoderamiento');

// ── Encuadres: cambian en cada plano (microcortes con ritmo); el CTA queda en base
const cta = at('Sigue');
const pattern = ['subtleIn', 'base', 'punchIn', 'subtleIn', 'base', 'subtleIn'];
let k = 0;
let outT = 0;
for (const s of e.segments) {
  const t = outT;
  outT += s.out - s.in;
  if (t >= cta.start - 0.1) {
    s.framing = 'base';
    s.move = 'none';
    continue;
  }
  s.framing = pattern[k++ % pattern.length];
  s.move = 'none';
  if (/te incluye a ti/.test(s.note || '') || /hazlos valer|tienes derechos/i.test(s.note || '')) s.framing = 'punchIn';
}
e.segments[0].framing = 'subtleIn';
e.segments[0].move = 'settle';

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
e.overlays = overlays;
e.sfx = sfx.sort((a, b) => a.at - b.at);
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
const photos = overlays.filter((o) => o.type === 'photoCard').length;
console.log(`✓ plan aplicado: ${overlays.length} recursos (${photos} fotos, ${overlays.filter((o) => o.type === 'lawPage').length} normas impresas), ${sfx.length} SFX`);
const gaps = [];
for (let i = 1; i < overlays.length; i++) if (overlays[i].start - overlays[i - 1].end > 2.5) gaps.push(`${overlays[i - 1].end}–${overlays[i].start}`);
if (gaps.length) console.log('  huecos sin estímulo > 2.5 s:', gaps.join(', '));
