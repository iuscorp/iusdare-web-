import fs from 'node:fs';
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(null);
Config.setChromiumOpenGlRenderer('swangle');

// Navegador: REMOTION_BROWSER o el Chromium headless preinstalado del entorno, si existe.
const candidates = [
  process.env.REMOTION_BROWSER,
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
].filter(Boolean) as string[];
const browser = candidates.find((c) => fs.existsSync(c));
if (browser) Config.setBrowserExecutable(browser);
