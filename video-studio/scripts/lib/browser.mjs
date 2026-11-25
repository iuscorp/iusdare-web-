import fs from 'node:fs';
/** Mismo criterio que remotion.config.ts: REMOTION_BROWSER o el headless shell local; si no, Remotion descarga el suyo. */
export const browserExecutable = () =>
  [process.env.REMOTION_BROWSER, '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell']
    .filter(Boolean)
    .find((c) => fs.existsSync(c)) ?? null;
