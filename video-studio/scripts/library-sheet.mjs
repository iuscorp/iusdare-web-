#!/usr/bin/env node
/** Genera documentation/component-library.jpg: un fotograma de cada componente del catálogo. */
import path from 'node:path';
import fs from 'node:fs';
import {renderStill, selectComposition} from '@remotion/renderer';
import {getBundle} from './lib/stills.mjs';
import {browserExecutable} from './lib/browser.mjs';
import {run} from './lib/ff.mjs';
import {STUDIO_ROOT} from './lib/paths.mjs';

const serveUrl = await getBundle();
const composition = await selectComposition({serveUrl, id: 'ComponentLibrary', browserExecutable: browserExecutable()});
const per = 60;
const n = Math.round(composition.durationInFrames / per);
const tmp = path.join(STUDIO_ROOT, 'previews', 'library');
fs.mkdirSync(tmp, {recursive: true});
for (let i = 0; i < n; i++) {
  await renderStill({serveUrl, composition, frame: i * per + 24, output: path.join(tmp, `${String(i).padStart(2, '0')}.jpg`), imageFormat: 'jpeg', scale: 0.33, browserExecutable: browserExecutable(), chromiumOptions: {gl: 'swangle'}});
}
const out = path.join(STUDIO_ROOT, 'documentation', 'component-library.jpg');
run('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(tmp, '*.jpg'), '-vf', `tile=6x${Math.ceil(n / 6)}:padding=6:color=white`, '-frames:v', '1', '-q:v', '3', out]);
console.log('✓', path.relative(STUDIO_ROOT, out));
