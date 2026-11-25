#!/usr/bin/env node
/**
 * Plan editorial de video-6 (transferencias simuladas: el voucher falso).
 * Se aplica sobre el EDL borrador: node projects/video-6/edit-plan.mjs
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

// Subtítulos
e.captions = e.captions.filter((c, i, a) => !(i > 0 && norm(c.text) === norm(a[i - 1].text) && norm(c.text).length > 3));
if (e.captions[0] && norm(e.captions[0].text) === 'te') e.captions[0].text = '¿Te';

// ── 1. HOOK (frame 0): el voucher → el dinero que no llega → ¡CUIDADO!
sticker('📲', 0, at('y').start - 0.03, 0.68, 0.62, 'hook: te mandan un voucher');
sticker('🏦', at('y').start, at('Cuidado').start - at('y').start - 0.03, 0.32, 0.62, '«el dinero no aparece en tu cuenta»');
const cuid = at('Cuidado');
add({type: 'kineticWord', syllables: ['¡CUIDADO!'], layout: 'line', uppercase: true, stepFrames: 3, x: 0.5, y: 0.58, start: cuid.start, end: at('podrias').start - 0.02}, 'alerta (ruptura de patrón)');
const pod = at('podrias');
sticker('🎭', pod.start, at('transferencia').start - pod.start - 0.03, 0.68, 0.62, 'víctima de un engaño');
add({type: 'selectionLabel', text: 'Transferencia simulada', cursor: true, x: 0.5, y: 0.64, start: at('transferencia').start - 0.05, end: at('Muchos').start - 0.03}, 'término clave');

// ── 2. La captura no prueba el pago
const muchos = at('Muchos');
// «la captura de pantalla»: sin emoji, zoom al celular que muestra (pedido del equipo)
const pero = at('pero');
add({type: 'denyMark', x: 0.68, y: 0.62, start: pero.start, end: at('La', pero.start).start - 0.03}, '«el voucher no garantiza el pago»');
const clave = at('La', pero.start);
sticker('🔐', clave.start, at('verificacion').start - clave.start - 0.03, 0.32, 0.62, 'la clave');
add({type: 'selectionLabel', text: 'Verificación', cursor: true, x: 0.5, y: 0.64, start: at('verificacion').start - 0.05, end: at('Primero').start - 0.03}, 'concepto clave');

// ── 3. Qué hacer: 1) 2) 3)
const pri = at('Primero');
sticker('📦', pri.start, at('monto').start - pri.start - 0.03, 0.68, 0.62, '1: no entregues el producto');
sticker('✅', at('monto').start, at('Segundo').start - at('monto').start - 0.03, 0.32, 0.62, 'hasta ver el monto en tu saldo');
const seg = at('Segundo');
sticker('🔔', seg.start, at('No', seg.start).start - seg.start - 0.03, 0.68, 0.62, '2: la notificación en tu app (Yape / Plin)');
const noC = at('No', seg.start);
sticker('📱', noC.start, at('porque', noC.start).start - noC.start - 0.03, 0.32, 0.62, 'no confíes en el celular del comprador');
const edit = at('porque', noC.start);
sticker('⏱️', edit.start, at('Ojo').start - edit.start - 0.03, 0.68, 0.62, '«las capturas se editan en segundos»');

// ── 4. Giro: si ya te pasó → es estafa (art. 196 CP impreso)
const ojo = at('Ojo');
sticker('😱', ojo.start, at('este').start - ojo.start - 0.03, 0.32, 0.62, '«ojo, si ya te pasó»');
const este = at('este');
add({type: 'verdictStamp', text: 'Es estafa', tone: 'deny', x: 0.5, y: 0.6, start: este.start, end: at('tipificado').start - 0.03}, 'veredicto');
const tip = at('tipificado');
add(
  {
    type: 'lawPage',
    source: 'Código Penal',
    heading: 'Artículo 196.- Estafa',
    body: 'El que procura para sí o para otro un provecho ilícito en perjuicio de tercero, **induciendo o manteniendo en error al agraviado mediante engaño**, astucia, ardid u otra forma fraudulenta, será reprimido con pena privativa de libertad no menor de uno ni mayor de seis años.',
    highlightAt: [0.5],
    x: 0.5,
    y: 0.69,
    start: tip.start,
    end: at('Debes').start - 0.04,
  },
  'base legal: art. 196 CP (verificar texto vigente)',
);

// ── 5. Qué guardar + denuncia
const deb = at('Debes');
sticker('💬', deb.start, at('numero').start - deb.start - 0.03, 0.68, 0.62, 'guarda los chats');
sticker('🔢', at('numero').start, at('hacer').start - at('numero').start - 0.03, 0.32, 0.62, 'número de cuenta del receptor');
sticker('📝', at('hacer').start, at('Al').start - at('hacer').start - 0.03, 0.68, 0.62, 'denuncia de inmediato');

// ── 6. Ley de Delitos Informáticos
const al = at('Al');
sticker('💻', al.start, at('tambien').start - al.start - 0.03, 0.32, 0.62, 'fraude por medios digitales');
add({type: 'lawCard', title: 'Ley N.° 30096', subtitle: 'Ley de Delitos Informáticos', color: 'yellow', x: 0.5, y: 0.66, start: at('tambien').start, end: at('para', at('30096').start).start - 0.03}, 'normativa');
const ras = at('para', at('30096').start);
sticker('👣', ras.start, at('Sigue').start - ras.start - 0.05, 0.68, 0.62, 'rastrear al responsable');

// ── Encuadres: pocos cambios visibles; crash sólo en los choques; CTA en base
const cta = at('Sigue');
const hits = [cuid.start, ojo.start, este.start];
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

// Primer plano del celular en «la captura de pantalla»: se parte el plano (audio continuo) y se
// encuadra el teléfono que la presentadora levanta (≈ x 0.26, y 0.65 del cuadro) a 2.2×.
{
  const cap = at('captura');
  const pero2 = at('pero', cap.start);
  let o = 0;
  for (let i = 0; i < e.segments.length; i++) {
    const s = e.segments[i];
    const d = s.out - s.in;
    if (cap.start >= o && cap.start < o + d) {
      const srcCut = r(s.in + (pero2.start - o) - 0.04); // fuente: justo antes de «pero»
      const srcIn = r(Math.max(s.in, s.in + (at('la', muchos.start).start - o) - 0.04)); // fuente: «la captura»
      const parts = [];
      if (srcIn > s.in + 0.05) parts.push({...s, out: srcIn});
      parts.push({...s, in: srcIn, out: srcCut, framing: {scale: 2.2, x: 0.58, y: -0.516}, move: 'crash', note: 'primer plano del celular (captura de pantalla)'});
      parts.push({...s, in: srcCut, framing: 'subtleIn', move: 'slowPush'});
      e.segments.splice(i, 1, ...parts);
      break;
    }
    o += d;
  }
}

const KEY = ['voucher', 'dinero', 'cuidado', 'simulada', 'captura', 'garantiza', 'verificacion', 'producto', 'saldo', 'notificacion', 'editan', 'estafa', 'chats', 'denuncia', 'digitales', 'informaticos', 'responsable'];
for (const c of e.captions) if (c.start < cta.start && KEY.includes(norm(c.text))) c.emphasis = true;

overlays.sort((a, b) => a.start - b.start);
overlays.forEach((o, i) => {
  const next = overlays[i + 1];
  if (next && o.end > next.start - 0.03) o.end = r(Math.max(o.start + 0.35, next.start - 0.03));
  if (o.end > cta.start - 0.05) o.end = r(Math.max(o.start + 0.35, cta.start - 0.05));
});
for (const t of [cuid.start, ojo.start]) overlays.push({type: 'flash', opacity: 0.7, start: r(t - 0.02), end: r(t + 0.16), note: 'ruptura de patrón'});
overlays.sort((a, b) => a.start - b.start);
e.overlays = overlays;
e.sfx = []; // sin SFX: el equipo los pone en su edición
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${overlays.length} recursos`);
const bad = overlays.filter((o) => o.end <= o.start);
if (bad.length) console.log('  ⚠️ recursos con tiempos inválidos:', bad.map((o) => o.note).join(', '));
