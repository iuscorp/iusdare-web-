import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {STUDIO_ROOT} from './paths.mjs';
import {browserExecutable} from './browser.mjs';

/**
 * Remotion copia la carpeta pública completa a /tmp en cada empaquetado. Con footage de
 * varios proyectos eso son GB por render (llenó el disco). Se arma una carpeta pública mínima
 * con ENLACES DUROS (no ocupan espacio) que sólo incluye el footage del proyecto en curso,
 * y el paquete temporal se borra al terminar (cleanupBundle).
 */
const linkTree = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, {recursive: true});
  for (const e of fs.readdirSync(src, {withFileTypes: true})) {
    const a = path.join(src, e.name);
    const b = path.join(dst, e.name);
    if (e.isDirectory()) linkTree(a, b);
    else if (!fs.existsSync(b)) {
      try {
        fs.linkSync(a, b);
      } catch {
        fs.copyFileSync(a, b);
      }
    }
  }
};

let bundled = null;
let bundledFor = null;
export const getBundle = async (slug = null) => {
  if (bundled && bundledFor === slug) return bundled;
  const pub = path.join(STUDIO_ROOT, '.build', `public-${slug ?? 'all'}`);
  fs.rmSync(pub, {recursive: true, force: true});
  const src = path.join(STUDIO_ROOT, 'public');
  for (const d of fs.readdirSync(src)) {
    if (d === 'footage') continue;
    const full = path.join(src, d);
    if (fs.statSync(full).isDirectory()) linkTree(full, path.join(pub, d));
  }
  if (slug) linkTree(path.join(src, 'footage', slug), path.join(pub, 'footage', slug));
  bundled = await bundle({entryPoint: path.join(STUDIO_ROOT, 'src', 'index.ts'), publicDir: pub});
  bundledFor = slug;
  return bundled;
};

export const cleanupBundle = () => {
  if (bundled && bundled.startsWith(os.tmpdir()) && /remotion-webpack-bundle-/.test(bundled)) fs.rmSync(bundled, {recursive: true, force: true});
  bundled = null;
  bundledFor = null;
};

/** Renderiza fotogramas reales de la composición VocareEdit (para el canvas y el QC). */
export const renderStills = async (edl, frames, outDir, {scale = 0.5} = {}) => {
  const serveUrl = await getBundle(edl.slug);
  const composition = await selectComposition({serveUrl, id: 'VocareEdit', inputProps: edl, browserExecutable: browserExecutable()});
  fs.mkdirSync(outDir, {recursive: true});
  const files = [];
  for (const frame of frames) {
    const f = Math.min(composition.durationInFrames - 1, Math.max(0, frame));
    const output = path.join(outDir, `still-${String(f).padStart(5, '0')}.jpg`);
    await renderStill({serveUrl, composition, inputProps: edl, frame: f, output, imageFormat: 'jpeg', jpegQuality: 85, scale, chromiumOptions: {gl: 'swangle'}, browserExecutable: browserExecutable()});
    files.push(output);
  }
  return files;
};

export const renderVideo = async (edl, output, {scale = 1, crf = 17, imageFormat = 'jpeg', x264Preset = 'medium', onProgress} = {}) => {
  const serveUrl = await getBundle(edl.slug);
  const composition = await selectComposition({serveUrl, id: 'VocareEdit', inputProps: edl, browserExecutable: browserExecutable()});
  fs.mkdirSync(path.dirname(output), {recursive: true});
  await renderMedia({
    serveUrl,
    composition,
    inputProps: edl,
    codec: 'h264',
    crf,
    scale,
    outputLocation: output,
    audioBitrate: '256k',
    imageFormat,
    jpegQuality: 100,
    x264Preset,
    pixelFormat: 'yuv420p',
    // mismo espacio de color que el footage de iPhone (BT.709, rango TV): evita el aspecto lavado
    colorSpace: 'bt709',
    chromiumOptions: {gl: 'swangle'}, browserExecutable: browserExecutable(),
    onProgress: ({progress}) => onProgress?.(progress),
  });
  return {output, durationInFrames: composition.durationInFrames, fps: composition.fps};
};
