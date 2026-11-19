import fs from 'node:fs';
import path from 'node:path';
import {python, run} from './ff.mjs';
import {PUBLIC_DIR, STUDIO_ROOT, projectPaths} from './paths.mjs';

/**
 * Si algún recurso va "detrás de la persona", genera (una vez) el recorte con alfa del
 * presentador para todo el footage y lo registra en el EDL. Devuelve true si el EDL cambió.
 */
export const ensurePersonMatte = (slug, edl, {force = false} = {}) => {
  if (!edl.overlays?.some((o) => o.behindPerson)) return false;
  const P = projectPaths(slug);
  const out = path.join(P.publicFootage, 'person.webm');
  if (force || !fs.existsSync(out)) {
    console.log('→ Recortando al presentador (texto detrás de la persona)…');
    run(python(), [path.join(STUDIO_ROOT, 'scripts', 'segment-person.py'), path.join(PUBLIC_DIR, edl.source.file), out], {stdio: ['ignore', 'ignore', 'inherit']});
  }
  const rel = path.relative(PUBLIC_DIR, out);
  if (edl.personMatte === rel) return false;
  edl.personMatte = rel;
  return true;
};
