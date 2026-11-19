import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {PUBLIC_DIR, STUDIO_ROOT} from './paths.mjs';
import {run} from './ff.mjs';

/**
 * Stickers con diseño de emoji de iOS (Apple) — decisión de Vocare Iuris.
 * Fuente 1: emoji-image (PNG 160 px, diseño Apple) por nombre corto.
 * Fuente 2: emoji-datasource-apple (PNG 64 px, diseño Apple) — se avisa porque se ve más blando.
 * Las imágenes son diseño de Apple: no se versionan (public/stickers está en .gitignore).
 */
const NM = path.join(STUDIO_ROOT, 'node_modules');
const IMG160 = path.join(NM, 'emoji-image', 'images');
const APPLE64 = path.join(NM, 'emoji-datasource-apple', 'img', 'apple', '64');

export const emojiKey = (emoji) =>
  Array.from(emoji)
    .map((c) => c.codePointAt(0).toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join('-');

let index = null;
const loadIndex = () => {
  if (index) return index;
  const require = createRequire(import.meta.url);
  const data = require(path.join(NM, 'emoji-datasource-apple', 'emoji.json'));
  index = new Map();
  for (const e of data) {
    const keys = [e.unified, e.non_qualified].filter(Boolean).map((u) => u.toLowerCase().split('-').filter((c) => c !== 'fe0f').join('-'));
    for (const k of keys) index.set(k, e);
  }
  return index;
};

export const ensureStickers = (emojis) => {
  const dst = path.join(PUBLIC_DIR, 'stickers');
  fs.mkdirSync(dst, {recursive: true});
  const missing = [];
  const lowRes = [];
  for (const e of new Set(emojis)) {
    const key = emojiKey(e);
    const target = path.join(dst, `${key}.png`);
    if (fs.existsSync(target)) continue;
    const meta = loadIndex().get(key);
    if (!meta) {
      missing.push(e);
      continue;
    }
    const hi = (meta.short_names ?? []).map((n) => path.join(IMG160, `${n}.png`)).find((f) => fs.existsSync(f));
    if (hi) {
      fs.copyFileSync(hi, target);
      continue;
    }
    const lo = path.join(APPLE64, meta.image);
    if (fs.existsSync(lo)) {
      // reescalado Lanczos a 160 px (mismo tamaño que el set de alta resolución)
      run('ffmpeg', ['-v', 'error', '-y', '-i', lo, '-vf', 'scale=160:160:flags=lanczos', target]);
      lowRes.push(e);
    } else missing.push(e);
  }
  if (lowRes.length) console.warn('⚠️ Emojis iOS sólo disponibles a 64 px (pueden verse suaves):', lowRes.join(' '));
  return missing;
};

export const emojisInEdl = (edl) => {
  const list = [];
  for (const o of edl.overlays ?? []) {
    if (o.type === 'sticker') list.push(o.emoji);
    if (o.type === 'emojiEquation') list.push(...o.items.filter((i) => !/^[+\-=?∞→×÷]+$/.test(i)));
    if (o.type === 'denyMark') list.push('❌');
    if (o.type === 'comparison') [o.left.emoji, o.right.emoji].filter(Boolean).forEach((e) => list.push(e));
  }
  return list;
};

/** Set curado para la biblioteca/catálogo. */
export const LIBRARY_EMOJIS = ['🏦', '⚙️', '⏳', '🏫', '🏢', '🤨', '😱', '🤔', '🫢', '👮', '👨‍🏫', '🔍', '⚖️', '📜', '💸', '🧾', '❌', '✅', '👉', '🙅‍♀️', '♟️', '🔞', '🗣️', '😭', '🕵️', '🏛️', '💼', '🏠', '📱', '🛒', '💳', '🚓', '👩‍⚖️', '🧑‍💼', '📢', '🤝', '⏰', '🚫', '💡', '❓', '🎟️', '📝', '🚪', '🏆'];
