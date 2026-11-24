#!/usr/bin/env node
/**
 * Plan editorial de video-11 (fotopapeleta: le prestaste el carro y te llegó la multa).
 * Se aplica sobre el EDL borrador: node projects/video-11/edit-plan.mjs
 *
 * Pedido: cortar silencios, imágenes y emojis, textos de retención y apoyos visuales al hook
 * (Guille Collado), subtítulos con seguimiento facial, todos del mismo tamaño (formato Reels).
 * Hook visual: carro → primo, y la multa en el parabrisas con destello de cámara en el frame ~3.
 * Todo dentro de la zona segura de Reels. Sin SFX.
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

// Subtítulos: correcciones (lo que dice la presentadora) y todos del mismo tamaño
const dropCap = (c) => {
  const i = e.captions.indexOf(c);
  if (i > 0) e.captions[i - 1].end = c.end;
  e.captions.splice(i, 1);
};
function S(w, after = 0) {
  return at(w, after).start;
}
{
  const fix = {cuando: 'Cuando', detesta: 'detecta', notifican: 'notifiquen', preve: 'pruebe', apelela: 'apela'};
  for (const c of e.captions) if (fix[norm(c.text)]) c.text = fix[norm(c.text)];
  // «Depende de quién fracción es» → «Depende de qué infracción es»
  at('quien', S('Depende')).text = 'qué';
  at('fraccion', S('Depende')).text = 'infracción';
  // «Y de aquí en el reglamento» → «Y de a quién el reglamento»
  const aq = at('aqui', S('Depende'));
  aq.text = 'a';
  at('en', aq.start).text = 'quién';
  // «Sí, en algunos casos» → «En algunos casos»
  dropCap(at('Si', S('responsable', S('Depende'))));
  // «carro sigue siendo tuyo» → «el carro…»
  const ca = at('carro', S('transferencia'));
  e.captions.splice(e.captions.indexOf(ca), 0, {...ca, text: 'el', end: ca.start + 0.12});
  ca.start += 0.12;
  // «Sí evocaré Iuris» → «Sigue a Vocare Iuris»
  const ev = at('evocare');
  e.captions[e.captions.indexOf(ev) - 1].text = 'Sigue a';
  ev.text = 'Vocare';
}
for (const c of e.captions) c.emphasis = false;

const until = (w, after = 0) => S(w, after) - 0.03;
const st = (emoji, t, end, x, note) => sticker(emoji, t, end - t, x, 0.6, note);

// ── 1. HOOK VISUAL: carro → primo / la multa en el parabrisas + destello de cámara
st('🚗', 0, until('primo'), 0.3, 'le prestaste el carro');
st('👦', S('primo'), until('Y'), 0.64, 'a tu primo');
const mul = at('multa');
add({type: 'photoCard', image: 'footage/video-11/photos/multa.jpg', w: 560, h: 420, rotate: -4, label: '¡MULTA!', credit: credits.multa?.credit, x: 0.47, y: 0.62, start: S('Y'), end: until('Que')}, 'la multa (foto con fondo: contexto)');
st('😮', S('Que'), until('Cuando'), 0.64, '¿qué puedes hacer?');

// ── 2. CÓMO FUNCIONA: cámara → notificación al propietario registrado
add({type: 'cutout', image: 'footage/video-11/photos/camara.png', w: 300, rotate: 4, credit: credits.camara?.credit, x: 0.64, y: 0.6, start: S('Cuando'), end: until('La')}, 'cámara de tránsito (objeto sin fondo)');
const inf = at('infraccion');
st('📩', S('La'), until('registro'), 0.64, 'la notificación');
add({type: 'lawCard', title: 'Registro vehicular', subtitle: 'SUNARP', color: 'white', x: 0.47, y: 0.66, start: S('registro'), end: until('Pero')}, 'propietario registrado');

// ── 3. GIRO: notificado ≠ responsable
const ojo = at('Pero');
add({type: 'kineticWord', syllables: ['¡OJO!'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.6, start: ojo.start, end: until('que', ojo.start)}, 'alerta');
add({type: 'textBadge', text: 'Notificado ≠\nresponsable', x: 0.47, y: 0.64, start: S('que', ojo.start), end: until('Depende')}, 'idea clave');
st('🚦', S('Depende'), until('Y', S('Depende')), 0.64, 'depende de la infracción');
add({type: 'lawCard', title: 'Reglamento de Tránsito', subtitle: 'D.S. 016-2009-MTC', color: 'yellow', x: 0.47, y: 0.66, start: S('Y', S('Depende')), end: until('En', S('Depende'))}, 'normativa (verificar cita)');
st('✋', S('En', S('Depende')), until('Pero', S('En', S('Depende'))), 0.64, 'a veces vas a responder');
const pero2 = at('Pero', S('En', S('Depende')));
add({type: 'textBadge', text: 'Hay base para\ncuestionarlo', x: 0.47, y: 0.64, start: pero2.start, end: until('Pero', pero2.start + 0.1)}, 'otras veces no');

// ── 4. EL CASO PEOR: vendiste y no registraste la transferencia
const peor = at('Pero', pero2.start + 0.1);
add({type: 'kineticWord', syllables: ['AÚN', 'PEOR'], layout: 'stack', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: peor.start, end: until('Si', peor.start)}, 'escalada');
st('🚙', S('Si', peor.start), until('Y', S('vendiste')), 0.64, 'vendiste tu carro');
st('🆔', S('Y', S('vendiste')), until('el', S('transferencia')), 0.3, 'no registraste la transferencia');
add({type: 'verdictStamp', text: 'Sigue siendo tuyo', tone: 'deny', x: 0.47, y: 0.6, start: S('el', S('transferencia')), end: until('Entonces')}, 'el carro sigue siendo tuyo');
st('🔁', S('Entonces'), until('Si', S('Entonces')), 0.64, 'las multas te siguen llegando');

// ── 5. QUÉ HACER
const si = at('Si', S('Entonces'));
add({type: 'textBadge', text: '5 días hábiles', x: 0.47, y: 0.64, start: si.start, end: until('Revisa')}, 'plazo desde la notificación');
add({type: 'stepList', title: 'Revisa la foto', steps: ['Placa', 'Fecha', 'Hora', 'Lugar'], x: 0.47, y: 0.62, start: S('Revisa'), end: until('Junta')}, 'qué revisar');
st('🗂️', S('Junta'), until('Y', S('Junta')), 0.64, 'junta pruebas: contrato, ubicación');
add({type: 'verdictStamp', text: 'Apela la multa', tone: 'ok', x: 0.47, y: 0.6, start: S('Y', S('Junta')), end: until('Sigue a')}, 'acción');

// ── Encuadres: cambio cada ~5 s; crash sólo en los choques; CTA en base
const cta = at('Sigue a');
const hits = [mul.start, ojo.start, peor.start];
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

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
for (const t of [mul.start, inf.start + 0.2, ojo.start, peor.start]) overlays.push({type: 'flash', opacity: 0.7, start: r(t - 0.02), end: r(t + 0.16), note: 'destello (cámara / ruptura de patrón)'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = []; // sin SFX: el equipo los pone en su edición
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos`);
const bad = overlays.filter((o) => o.end <= o.start);
if (bad.length) console.log('  ⚠️ recursos con tiempos inválidos:', bad.map((o) => o.note).join(', '));
