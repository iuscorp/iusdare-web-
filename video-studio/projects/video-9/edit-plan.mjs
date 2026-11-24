#!/usr/bin/env node
/**
 * Ping pong con Martín (abogado laboralista) — promo del live del 1 de diciembre.
 * Pedido: cortar silencios y elegir los mejores clips. Mismo formato que «miraval»:
 * entrevistador = R (micrófono), abogado = L. Sin subtítulos, sin recursos gráficos ni SFX;
 * encuadre fijo para no recortar a ninguno de los dos.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const f = path.join(dir, 'edl.json');
const e = JSON.parse(fs.readFileSync(f, 'utf8'));

e.captions = []; // sin subtítulos (como el ping pong anterior)
// Pedido: «no cortes las palabras / que se entienda». Dentro de una misma toma se conservan las
// pausas naturales (< 0.6 s): se unen los tramos contiguos en vez de cortar entre palabras.
{
  const merged = [];
  for (const sg of e.segments) {
    const prev = merged[merged.length - 1];
    if (prev && sg.in - prev.out >= 0 && sg.in - prev.out < 0.6) prev.out = sg.out;
    else merged.push({...sg});
  }
  e.segments = merged;
}
for (const s of e.segments) {
  s.framing = 'base';
  s.move = 'none';
}
e.overlays = [];
e.sfx = [];
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${e.segments.length} planos`);
