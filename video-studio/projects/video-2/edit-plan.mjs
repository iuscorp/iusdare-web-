#!/usr/bin/env node
/**
 * Plan editorial de video-2 (rejas en la calle / libertad de tránsito).
 * Se aplica sobre el EDL borrador: node projects/video-2/edit-plan.mjs
 * Cada recurso tiene su función narrativa anotada (códigos nativos).
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const f = path.join(dir, 'edl.json');
const e = JSON.parse(fs.readFileSync(f, 'utf8'));
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const at = (word, after = 0) => {
  const c = e.captions.find((x) => norm(x.text) === norm(word) && x.start >= after);
  if (!c) throw new Error(`palabra no encontrada: ${word} (después de ${after})`);
  return c;
};
const r = (x) => Math.round(x * 1000) / 1000;
const overlays = [];
const sfx = [];
const sticker = (emoji, word, after, dur = 1.6, x = 0.7, y = 0.62, why = '') => {
  const c = at(word, after);
  overlays.push({type: 'sticker', emoji, size: 165, x, y, start: r(c.start), end: r(c.start + dur), note: why});
  sfx.push({name: 'pop', at: r(c.start), volumeDb: -16});
  return c;
};

// 1. Hook — situación cotidiana: la reja en la calle
sticker('🚧', 'reja', 0, 1.8, 0.7, 0.62, 'actor del conflicto: la reja');
// 2. "Imagina que vives en una urbanización…"
const imag = sticker('🏠', 'urbanizacion', 0, 1.6, 0.3, 0.62, 'situar al espectador');
// 3. "Hay mucha delincuencia, pongamos una reja y listo"
sticker('😰', 'delincuencia', imag.start, 1.2, 0.7, 0.62, 'emoción de los vecinos');
// 4. "Todos están de acuerdo"
sticker('🤝', 'acuerdo', imag.start, 1.2, 0.3, 0.62, 'consenso vecinal');
// 5. "…quieres pasar por la calle" → 6. "y la reja está cerrada"
const pasar = sticker('🚶', 'pasar', imag.start, 1.3, 0.7, 0.62, 'el espectador en la escena');
const cerr = at('cerrada', pasar.start);
overlays.push({type: 'sticker', emoji: '🔒', size: 165, x: 0.3, y: 0.62, start: r(cerr.start - 0.2), end: r(cerr.start + 1.2), note: 'giro: queda encerrado'});
sfx.push({name: 'poi', at: r(cerr.start - 0.2), volumeDb: -15});
// 7. "¿Y ahora qué? ¿A quién llamas?" — pregunta abierta
sticker('🤔', 'que', cerr.start, 1.6, 0.7, 0.62, 'loop abierto: la duda del público');
// 8. Problema constitucional → término clave
const lib = at('libertad', cerr.start);
overlays.push({type: 'selectionLabel', text: 'Libertad de tránsito', cursor: true, start: r(lib.start - 0.15), end: r(lib.start + 1.9), note: 'concepto jurídico central'});
sfx.push({name: 'click', at: r(lib.start - 0.1), volumeDb: -14});
// 9. "El TC ha señalado…" — fuente
const tc = at('TC', lib.start);
overlays.push({type: 'lawCard', title: 'TC', subtitle: 'Tribunal Constitucional', color: 'white', start: r(tc.start), end: r(tc.start + 2.4), note: 'base legal / institución'});
sfx.push({name: 'type', at: r(tc.start), volumeDb: -16});
// 10. "…puede ser válida cuando busca proteger la seguridad ciudadana"
sticker('✅', 'valida', tc.start, 1.6, 0.7, 0.62, 'matiz: sí puede ser válida');
sfx.push({name: 'kiran', at: r(at('valida', tc.start).start), volumeDb: -16});
// 11. "Pero ojo." — ruptura de patrón
sticker('👀', 'ojo', tc.start, 1.0, 0.3, 0.62, 'pattern interrupt');
// 12. "No significa que… porque se les dé la gana" — negación
const noSig = at('significa', tc.start);
overlays.push({type: 'denyMark', x: 0.28, y: 0.62, start: r(noSig.start - 0.25), end: r(noSig.start + 1.4), note: 'negación'});
sfx.push({name: 'poi', at: r(noSig.start - 0.25), volumeDb: -15});
// 13. "La medida debe ser razonable y proporcional" — requisito
const raz = at('razonable', noSig.start);
overlays.push({type: 'selectionLabel', text: 'Razonable y proporcional', cursor: true, start: r(raz.start - 0.2), end: r(raz.start + 2.0), note: 'requisito 1'});
sfx.push({name: 'click', at: r(raz.start - 0.15), volumeDb: -14});
// 14. "…además de contar con la autorización correspondiente"
sticker('📄', 'autorizacion', raz.start, 1.5, 0.7, 0.62, 'requisito 2: permiso');
// 15. "Por ejemplo, en un caso… en Surco"
sticker('📍', 'surco', raz.start, 1.2, 0.3, 0.62, 'caso real');
// 16. "el TC ordenó su retiro" — veredicto con sello de impacto
const ord = at('ordeno', raz.start);
overlays.push({type: 'verdictStamp', text: 'Retiro ordenado', tone: 'deny', start: r(ord.start), end: r(ord.start + 1.6), note: 'veredicto del caso (verificar redacción)'});
sfx.push({name: 'riser', at: r(Math.max(0, ord.start - 1.55)), volumeDb: -22});
sfx.push({name: 'stamp', at: r(ord.start), volumeDb: -11});
sfx.push({name: 'fahhh', at: r(ord.start + 0.12), volumeDb: -17});
// 17. "…porque no se acreditó la autorización municipal"
sticker('🏛️', 'municipal', ord.start, 1.4, 0.7, 0.62, 'municipalidad');
// 18. "La pregunta es: ¿cómo protegemos la seguridad…?"
sticker('🤔', 'pregunta', ord.start, 1.4, 0.7, 0.62, 'pregunta guía');
// 19. "Porque sí, la seguridad es importante"
sticker('🛡️', 'importante', ord.start, 1.3, 0.3, 0.62, 'seguridad sí importa');
// 20. "Recuerda: … no permite restringir arbitrariamente…" — cierre en bucle
const rec = at('arbitrariamente', ord.start);
overlays.push({type: 'selectionLabel', text: 'Libre tránsito', cursor: false, start: r(at('libre', rec.start).start - 0.1), end: r(at('libre', rec.start).start + 1.6), note: 'cierre: vuelve al concepto'});
sfx.push({name: 'kiran', at: r(at('libre', rec.start).start - 0.1), volumeDb: -16});

// encuadres con intención: punch-in en "Pero ojo" y en el veredicto del caso
for (const s of e.segments) {
  const t = (s.note || '').toLowerCase();
  if (/pero ojo/.test(t) || /orden[oó] su retiro/.test(t) || /^recuerda/.test(t)) s.framing = 'punchIn';
  if (/^¿pueden los vecinos/.test(t)) {
    s.framing = 'subtleIn';
    s.move = 'settle';
  }
}

overlays.sort((a, b) => a.start - b.start);
// sin solapes: cada recurso termina antes de que entre el siguiente; nada invade el CTA
const ctaStart = e.captions.find((c) => norm(c.text) === 'asi' && c.start > e.captions[e.captions.length - 1].start - 8)?.start ?? Infinity;
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.05) o.end = r(Math.max(o.start + 0.5, next.start - 0.05));
  if (o.end > ctaStart - 0.05) o.end = r(Math.max(o.start + 0.5, ctaStart - 0.05));
});
e.overlays = overlays;
e.sfx = sfx.sort((a, b) => a.at - b.at);
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${e.overlays.length} recursos, ${e.sfx.length} SFX`);
