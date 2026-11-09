import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {STUDIO_ROOT} from './paths.mjs';
import {browserExecutable} from './browser.mjs';

let bundled = null;
export const getBundle = async () => {
  if (!bundled) {
    bundled = await bundle({entryPoint: path.join(STUDIO_ROOT, 'src', 'index.ts'), publicDir: path.join(STUDIO_ROOT, 'public')});
  }
  return bundled;
};

/** Renderiza fotogramas reales de la composición VocareEdit (para el canvas y el QC). */
export const renderStills = async (edl, frames, outDir, {scale = 0.5} = {}) => {
  const serveUrl = await getBundle();
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
  const serveUrl = await getBundle();
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
