/**
 * Utilidades de subtítulos compartidas entre el render y los scripts.
 * La lógica "pesada" (limpieza, remapeo de tiempos) vive en scripts/lib/edit.mjs;
 * aquí sólo está lo que la composición necesita en tiempo de render.
 */

/** Palabras que en las referencias reciben énfasis visual (veredicto / concepto legal). */
export const DEFAULT_EMPHASIS = [
  'ilegal',
  'legal',
  'derecho',
  'derechos',
  'ley',
  'constitución',
  'delito',
  'denuncia',
  'denunciar',
  'prohibido',
  'obligación',
  'gratis',
  'nunca',
  'nadie',
  'excepción',
  'transparencia',
];

export const isEmphasis = (word: string, extra: string[] = []) => {
  const w = word.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]/gu, '');
  return DEFAULT_EMPHASIS.includes(w) || extra.includes(w);
};
