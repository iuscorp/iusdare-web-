#!/usr/bin/env node
/**
 * Ping Pong con Miguel Eduardo Ramos Miraval (promo del live).
 * Pedido: unir los clips en el orden de las preguntas, cortar silencios y subtítulos con
 * seguimiento facial de cada persona (entrevistador = L, abogado = R). Sin recursos gráficos
 * ni efectos de sonido; encuadre fijo para no recortar a ninguno de los dos.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const f = path.join(dir, 'edl.json');
const e = JSON.parse(fs.readFileSync(f, 'utf8'));
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

// subtítulos: palabras duplicadas por el margen de transcripción + signos de pregunta
e.captions = e.captions.filter((c, i, a) => !(i > 0 && norm(c.text) === norm(a[i - 1].text) && norm(c.text).length > 3));
for (const c of e.captions) {
  if (c.text === 'Mirabal') c.text = 'Miraval';
  if (c.text === 'A' && c.who === 'L') c.text = '¿A';
  if (c.text === 'Cuál') c.text = '¿Cuál';
}
for (const c of e.captions) c.emphasis = ['abogado', 'docente', 'publicidad', 'teatro', 'tribunales', 'error', 'mito', 'alimentos', 'tasas', 'judiciales', 'live', 'noviembre', 'noche'].includes(norm(c.text));

// subtítulos sólo desde «Si no hubiese sido abogado…» (pedido del equipo) y más pequeños
const desde = e.captions.find((c) => norm(c.text) === 'si' && c.who === 'L');
if (desde) e.captions = e.captions.filter((c) => c.start >= desde.start);
e.captionScale = 0.7;
// pedido final del equipo: sin subtítulos
e.captions = [];

for (const s of e.segments) {
  s.framing = 'base';
  s.move = 'none';
}
e.overlays = [];
e.sfx = [];
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
const who = e.captions.reduce((a, c) => ((a[c.who ?? '?'] = (a[c.who ?? '?'] || 0) + 1), a), {});
console.log(`✓ plan aplicado: ${e.segments.length} planos, subtítulos por persona: ${JSON.stringify(who)}`);
