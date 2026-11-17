#!/usr/bin/env node
/**
 * Plan editorial de video-7 (NVIDIA y el «hecho de importancia» en Perú).
 * Se aplica sobre el EDL borrador: node projects/video-7/edit-plan.mjs
 *
 * Códigos nativos (documentation/05-codigos-nativos.md):
 *  - Hook: el comunicado de NVIDIA (📢) y la pregunta retórica «¿Qué decía?».
 *  - Choque: «cayeron más del 5 %» (crash + palabra cinética) → «Porque está obligada» (sello).
 *  - Base legal: tarjeta «Hecho de importancia» y tarjeta «SMV» (únicas imágenes: normativa).
 *  - Emojis nuevos a 160 px en cada idea; sin SFX; pocos cambios de encuadre; CTA limpio.
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

// Subtítulos: correcciones de transcripción (fieles a lo que dice la presentadora)
const fix = {hacia: 'decía', mas: 'más', cambia: 'cambie', tocabamos: 'tocamos', telo: 'Cuéntalo'};
for (const c of e.captions) {
  const k = norm(c.text);
  if (fix[k]) c.text = c.text.match(/[¿?.,]/) ? c.text.replace(/[\wáéíóúñ]+/i, fix[k]) : fix[k];
}
{
  // «Si abocar a Iuris» → «Sigue a Vocare Iuris»
  const i = e.captions.findIndex((c) => norm(c.text) === 'abocar');
  if (i > 0) {
    e.captions[i - 1].text = 'Sigue';
    e.captions[i].text = 'a';
    e.captions[i + 1].text = 'Vocare';
  }
}
e.captions = e.captions.filter((c, i, a) => !(i > 0 && norm(c.text) === norm(a[i - 1].text) && norm(c.text).length > 3));

const S = (w, after = 0) => at(w, after).start;
const until = (w, after = 0) => S(w, after) - 0.03;
const st = (emoji, t, end, x, note) => sticker(emoji, t, end - t, x, 0.62, note);

// ── 1. HOOK: el comunicado → ¿qué decía? → el CEO investigado → espionaje
st('📢', 0, until('Que'), 0.68, 'hook: NVIDIA publicó un comunicado');
st('❔', S('Que'), until('Que', 3.5), 0.32, '«¿Qué decía?»');
st('🎩', S('directorio'), until('investigando'), 0.68, 'el directorio');
st('🔦', S('investigando'), until('Por'), 0.32, 'investigando a su propio CEO');
st('📰', S('Por'), until('espionaje'), 0.68, 'por reportes');
st('👂', S('espionaje'), until('El', 9), 0.32, 'espionaje extranjero');

// ── 2. CHOQUE: el lunes cayeron las acciones
const lun = at('El', 9);
st('📆', lun.start, until('cayeron'), 0.68, 'el lunes');
const cay = at('cayeron');
add({type: 'kineticWord', syllables: ['−5 %'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: cay.start, end: until('Ahora')}, 'cayeron más del 5 % (dato a verificar)');
st('💡', S('Ahora'), until('Que', 16), 0.32, '«ahora piensa»');
st('🔥', S('Que', 16), until('Porque'), 0.68, 'perder millones');
const obl = at('Porque');
add({type: 'verdictStamp', text: 'Está obligada', tone: 'ok', x: 0.5, y: 0.6, start: obl.start, end: until('Y', obl.start)}, 'respuesta: obligación legal');

// ── 3. BASE LEGAL: en Perú → hecho de importancia
st('🗺️', S('Peru'), until('Se', 20), 0.32, 'en Perú existe la misma regla');
add({type: 'lawCard', title: 'Hecho de importancia', subtitle: 'Ley del Mercado de Valores · SMV', color: 'yellow', x: 0.5, y: 0.66, start: S('Se', 20), end: until('Si', 22)}, 'normativa (verificar cita)');
st('📈', S('Si', 22), until('bonos'), 0.68, 'vende acciones en bolsa');
st('📃', S('bonos'), until('Y', 27), 0.32, 'o bonos');
st('😳', S('pasa'), until('cambie'), 0.68, 'pasa algo importante');
st('🔄', S('cambie'), until('Tiene'), 0.32, 'cambia de opinión');
st('📣', S('Tiene'), until('Y', 34), 0.68, 'tiene que contarlo');

// ── 4. ¿Cuándo? → el mismo día; si duda → igual
st('⏰', S('cuando'), until('mismo'), 0.32, '¿Y cuándo?');
add({type: 'selectionLabel', text: 'El mismo día', cursor: true, x: 0.5, y: 0.64, start: S('mismo') - 0.05, end: until('Y', 37)}, 'plazo');
st('😕', S('duda'), until('Igual'), 0.68, 'la empresa duda');
const igu = at('Igual');
add({type: 'kineticWord', syllables: ['IGUAL'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: igu.start, end: until('Por', igu.start)}, 'igual tiene que contarlo');

// ── 5. ¿Por qué tan estricto? → los gerentes saben → pierdes tú
st('😤', S('Por', igu.start), until('Imagina'), 0.32, '¿por qué tan estricto?');
st('🤐', S('Imagina'), until('el', 45), 0.68, 'sólo los gerentes saben');
st('😵', S('el', 45), until('eres'), 0.32, 'acciones que valen menos');
const tu = at('eres');
add({type: 'kineticWord', syllables: ['¡TÚ!'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: tu.start, end: until('Y', tu.start)}, 'el que pierde eres tú');

// ── 6. Giro: la AFP → tu plata
st('🙃', S('Y', tu.start), until('Si', 52), 0.68, '«no creas que no tiene que ver contigo»');
st('🐷', S('Si', 52), until('parte'), 0.32, 'tu AFP');
st('💵', S('parte'), until('Por', 56), 0.68, 'tu plata invertida');

// ── 7. Sanción
st('🙊', S('Por', 56), until('la', 58.5), 0.32, 'oculta información');
st('⌛', S('la', 58.5), until('La', 59.5), 0.68, 'o la cuenta tarde');
add({type: 'lawCard', title: 'SMV', subtitle: 'Superintendencia del Mercado de Valores', color: 'white', x: 0.5, y: 0.66, start: S('La', 59.5), end: until('sancionarla')}, 'autoridad supervisora');
st('🚨', S('sancionarla'), until('Y', 62), 0.32, 'puede sancionarla');

// ── 8. Pregunta al público + CTA
st('🤞', S('Lograste'), until('Cuentalo'), 0.68, '¿lograste vender?');
st('💭', S('Cuentalo'), until('Sigue'), 0.32, 'cuéntalo en los comentarios');

// ── Encuadres: pocos cambios visibles; crash sólo en los choques; CTA en base
const cta = at('Sigue');
const hits = [cay.start, obl.start, tu.start];
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

const KEY = ['nvidia', 'comunicado', 'ceo', 'espionaje', 'cayeron', 'millones', 'obligada', 'peru', 'importancia', 'bolsa', 'sensata', 'contarlo', 'dia', 'igual', 'estricto', 'gerentes', 'tu', 'afp', 'plata', 'oculta', 'tarde', 'smv', 'sancionarla', 'comentarios'];
for (const c of e.captions) if (c.start < cta.start && KEY.includes(norm(c.text))) c.emphasis = true;

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
for (const t of [cay.start, obl.start]) overlays.push({type: 'flash', opacity: 0.7, start: r(t - 0.02), end: r(t + 0.16), note: 'ruptura de patrón'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = []; // sin SFX: el equipo los pone en su edición
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos`);
const bad = overlays.filter((o) => o.end <= o.start);
if (bad.length) console.log('  ⚠️ recursos con tiempos inválidos:', bad.map((o) => o.note).join(', '));
