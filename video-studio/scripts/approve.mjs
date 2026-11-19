#!/usr/bin/env node
/**
 * PASO 5 — APROBACIÓN
 * npm run approve -- <slug> "nota del director"
 * Registra en projects/<slug>/project.json que la dirección creativa del canvas fue aprobada.
 * Sólo se ejecuta cuando el responsable de Vocare Iuris aprueba explícitamente el canvas.
 */
import {parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';

const args = parseArgs();
const [slug, note] = args._;
const P = projectPaths(slug);
const meta = readJson(P.meta);
meta.approval = {approved: true, approvedAt: new Date().toISOString(), notes: [...(meta.approval?.notes ?? []), note ?? 'Aprobado']};
meta.status = 'aprobado';
writeJson(P.meta, meta);
console.log(`✓ Canvas aprobado para ${slug}. Ya puedes ejecutar: npm run render -- ${slug}`);
