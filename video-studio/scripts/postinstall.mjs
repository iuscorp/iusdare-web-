#!/usr/bin/env node
// Copia el set curado de stickers 3D a public/stickers (no se versionan).
import {LIBRARY_EMOJIS, ensureStickers} from './lib/assets.mjs';
try {
  const missing = ensureStickers(LIBRARY_EMOJIS);
  if (missing.length) console.warn('Stickers sin asset:', missing.join(' '));
} catch (e) {
  console.warn('postinstall: no se pudieron copiar stickers:', e.message);
}
