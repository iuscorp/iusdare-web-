import fs from 'node:fs';
import path from 'node:path';
import {PUBLIC_DIR, STUDIO_ROOT} from './paths.mjs';

const EMOJI_SRC = path.join(STUDIO_ROOT, 'node_modules', '@lobehub', 'fluent-emoji-3d', 'assets');

export const emojiKey = (emoji) =>
  Array.from(emoji)
    .map((c) => c.codePointAt(0).toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join('-');

/** Copia a public/stickers los emojis 3D (Fluent Emoji 3D, MIT) que use el EDL. */
export const ensureStickers = (emojis) => {
  const dst = path.join(PUBLIC_DIR, 'stickers');
  fs.mkdirSync(dst, {recursive: true});
  const missing = [];
  for (const e of new Set(emojis)) {
    const key = emojiKey(e);
    const target = path.join(dst, `${key}.webp`);
    if (fs.existsSync(target)) continue;
    const cps = Array.from(e).map((c) => c.codePointAt(0).toString(16));
    const candidates = [cps.join('-'), key, `${key}-fe0f`];
    const found = candidates.map((c) => path.join(EMOJI_SRC, `${c}.webp`)).find((f) => fs.existsSync(f));
    if (found) fs.copyFileSync(found, target);
    else missing.push(e);
  }
  return missing;
};

export const emojisInEdl = (edl) => {
  const list = [];
  for (const o of edl.overlays ?? []) {
    if (o.type === 'sticker') list.push(o.emoji);
    if (o.type === 'emojiEquation') list.push(...o.items.filter((i) => !/^[+\-=?∞→×÷]+$/.test(i)));
    if (o.type === 'comparison') [o.left.emoji, o.right.emoji].filter(Boolean).forEach((e) => list.push(e));
  }
  return list;
};

/** Set curado para la biblioteca/catálogo. */
export const LIBRARY_EMOJIS = ['🏦', '⚙️', '⏳', '🏫', '🏢', '🤨', '😱', '🤔', '🫢', '👮', '👨‍🏫', '🔍', '⚖️', '📜', '💸', '🧾', '❌', '✅', '👉', '🙅‍♀️', '♟️', '🔞', '🗣️', '😭', '🕵️', '🏛️', '💼', '🏠', '📱', '🛒', '💳', '🚓', '👩‍⚖️', '🧑‍💼', '📢', '🤝', '⏰', '🚫', '💡', '❓'];
