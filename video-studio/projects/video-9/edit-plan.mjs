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
for (const s of e.segments) {
  s.framing = 'base';
  s.move = 'none';
}
e.overlays = [];
e.sfx = [];
e.colorPreset = 'none';
fs.writeFileSync(f, JSON.stringify(e, null, 2));
console.log(`✓ plan aplicado: ${e.segments.length} planos`);
