import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

export const STUDIO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC_DIR = path.join(STUDIO_ROOT, 'public');
export const PROJECTS_DIR = path.join(STUDIO_ROOT, 'projects');

export const projectDir = (slug) => {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`Slug inválido: "${slug}". Usa minúsculas, números y guiones (p. ej. "cobros-bancarios").`);
  }
  return path.join(PROJECTS_DIR, slug);
};

export const projectPaths = (slug) => {
  const dir = projectDir(slug);
  return {
    dir,
    brief: path.join(dir, 'brief.md'),
    meta: path.join(dir, 'project.json'),
    probe: path.join(dir, 'analysis', 'probe.json'),
    transcript: path.join(dir, 'analysis', 'transcript.json'),
    cleanup: path.join(dir, 'analysis', 'cleanup.json'),
    analysisDir: path.join(dir, 'analysis'),
    edl: path.join(dir, 'edl.json'),
    canvasDir: path.join(STUDIO_ROOT, 'canvas', slug),
    previewsDir: path.join(STUDIO_ROOT, 'previews', slug),
    exportsDir: path.join(STUDIO_ROOT, 'exports', slug),
    publicFootage: path.join(PUBLIC_DIR, 'footage', slug),
  };
};

export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
};

export const parseArgs = (argv = process.argv.slice(2)) => {
  const out = {_: []};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
};
