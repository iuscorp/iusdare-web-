#!/usr/bin/env node
/** Pruebas del motor de edición sin footage: npm run test:pipeline */
import assert from 'node:assert/strict';
import {applyGlossary, buildEdl, cleanup, refineWithSilences} from './lib/edit.mjs';
import {edlSchemaCheck} from './lib/validate.mjs';
import {readJson} from './lib/paths.mjs';
import path from 'node:path';
import {STUDIO_ROOT} from './lib/paths.mjs';

const W = (w, s, e, p = 0.95) => ({w, s, e, p});
let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log('✓', name);
};

test('elimina silencios > 0.3 s y conserva habla continua', () => {
  const t = {duration: 6, words: [W('Hola', 0, 0.4), W('a', 0.45, 0.5), W('todos.', 0.55, 0.9), W('Esto', 2.5, 2.8), W('sigue.', 2.85, 3.2)]};
  const c = cleanup(t);
  assert.equal(c.ranges.length, 2);
  assert.ok(c.removed.some((r) => r.kind === 'silence'));
  assert.ok(c.stats.outputDuration < 2);
});

test('conserva pausa dramática antes de "ilegal"', () => {
  const t = {duration: 3, words: [W('Eso', 0, 0.3), W('es', 0.35, 0.5), W('ilegal.', 0.9, 1.4)]};
  const c = cleanup(t);
  assert.equal(c.ranges.length, 1);
  assert.equal(c.keptPauses.length, 1);
});

test('detecta toma repetida y conserva la última', () => {
  const t = {duration: 10, words: [W('Te', 0, 0.2), W('pueden', 0.2, 0.5), W('despedir.', 0.5, 1), W('Te', 2.5, 2.7), W('pueden', 2.7, 3), W('despedir', 3, 3.4), W('así.', 3.4, 3.8)]};
  const c = cleanup(t);
  assert.ok(c.removed.some((r) => r.kind === 'retake' && r.from === 0));
  assert.equal(c.ranges[0].words[0].s, 2.5);
});

test('NO confunde frases distintas con el mismo comienzo con una toma repetida', () => {
  const ws = 'Y si te quieren bajar la nota de conducta no tienes sustento. Y si te sacan de clase eso vulnera tu derecho.'.split(' ');
  const t = {duration: 12, words: ws.map((w, i) => W(w, i * 0.3, i * 0.3 + 0.25))};
  const c = cleanup(t);
  assert.ok(!c.removed.some((r) => r.kind === 'retake'));
});

test('elimina muletillas puras', () => {
  const c = cleanup({duration: 3, words: [W('Mira', 0, 0.3), W('eh', 0.35, 0.5), W('esto.', 0.55, 0.9)]});
  assert.ok(c.removed.some((r) => r.kind === 'filler'));
});

test('corrige palabras estiradas sobre un silencio', () => {
  const out = refineWithSilences([W('con', 1.0, 1.2), W('una', 1.2, 2.4)], [{start: 1.25, end: 2.2}]);
  assert.ok(out[1].s >= 2.1);
});

test('glosario: marca, institución y números de ley', () => {
  const g = readJson(path.join(STUDIO_ROOT, 'templates', 'glossary.json'));
  const out = applyGlossary([W('Sigue', 0, 0.2), W('Bocari', 0.2, 0.5), W('Yuris', 0.5, 0.8), W('ley', 1, 1.2), W('29', 1.2, 1.4), W('.719', 1.4, 1.8), W('intercopy', 2, 2.5)], g);
  const text = out.map((w) => w.w).join(' ');
  assert.equal(text, 'Sigue Vocare Iuris ley 29719 Indecopi');
});

test('EDL: planos alineados a fotogramas, subtítulos dentro de la duración, válido', () => {
  const words = [];
  let t = 0;
  'Te cobraron una comisión que nadie te explicó eso es ilegal según la Ley 29571 así que reclama al banco y sigue a Vocare Iuris'.split(' ').forEach((w) => {
    words.push(W(w, t, t + 0.25));
    t += 0.3;
  });
  const c = cleanup({duration: t + 0.5, words});
  const edl = buildEdl({slug: 'test', title: 't', source: {file: 'x.mp4', width: 1080, height: 1920, fps: 30, duration: t + 0.5}, clean: c});
  edlSchemaCheck(edl);
  const total = edl.segments.reduce((a, s) => a + Math.round(s.out * 30) - Math.round(s.in * 30), 0) / 30;
  assert.ok(edl.captions.every((cap) => cap.end <= total + 0.05));
  assert.ok(edl.segments.length >= 3, 'debe partir en sub-planos');
  assert.ok(edl.overlays.some((o) => o.type === 'lawCard' && o.title === 'Ley 29571'));
  assert.ok(edl.overlays.some((o) => o.type === 'verdictStamp'));
  assert.equal(edl.segments[0].role, 'hook');
});

test('selects: tomas en orden de guion (no cronológico) con corte entre tomas', () => {
  const words = [W('Uno', 0, 0.3), W('dos.', 0.35, 0.6), W('Tres', 5, 5.3), W('cuatro.', 5.35, 5.7)];
  const c = cleanup({duration: 6, words}, {selects: [{in: 4.9, out: 5.8}, {in: 0, out: 0.7}]});
  assert.equal(c.ranges.length, 2);
  assert.equal(c.ranges[0].words[0].w, 'Tres');
  assert.equal(c.ranges[1].words[0].w, 'Uno');
  assert.ok(c.ranges[1].in < 0.1 && c.ranges[0].out < 5.9);
});

test('no descarta palabras con duración 0 de Whisper', () => {
  const c = cleanup({duration: 2, words: [W('Puede', 0.5, 0.5), W('ser', 0.5, 0.7), W('válida.', 0.72, 1.1)]});
  assert.equal(c.ranges[0].words.map((w) => w.w).join(' '), 'Puede ser válida.');
});

test('una palabra final en voz baja no se pierde (silencio no profundo)', () => {
  const words = [W('libre', 1.0, 1.2), W('tránsito.', 1.25, 1.6)];
  const c = cleanup({duration: 3, words}, {silences: [{start: 1.22, end: 2.5}], deepSilences: [{start: 1.7, end: 2.5}], selects: [{in: 0.9, out: 1.7}]});
  assert.equal(c.ranges.flatMap((r) => r.words).map((w) => w.w).join(' '), 'libre tránsito.');
});

console.log(`\n${n} pruebas OK`);
