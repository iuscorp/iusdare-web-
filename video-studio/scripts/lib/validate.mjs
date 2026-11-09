/** Validación ligera del EDL en Node (el esquema completo zod se aplica en Remotion). */
const TYPES = ['sticker', 'lawCard', 'selectionLabel', 'documentCover', 'logoBadge', 'photoCard', 'backgroundPlate', 'bigLetter', 'denyMark', 'verdictStamp', 'stepList', 'comparison', 'emojiEquation', 'kineticWord', 'revealTitle', 'textBadge'];
const SFX = ['pop', 'whoosh', 'type', 'click', 'ding', 'boom', 'swish'];

export const edlSchemaCheck = (edl) => {
  const errs = [];
  if (!edl.segments?.length) errs.push('El EDL no tiene segmentos.');
  edl.segments?.forEach((s) => {
    if (!(s.out > s.in)) errs.push(`Segmento ${s.id}: out debe ser > in.`);
    if (s.out > edl.source.duration + 0.05) errs.push(`Segmento ${s.id}: out (${s.out}) excede la duración del footage (${edl.source.duration}).`);
  });
  const total = edl.segments.reduce((a, s) => a + s.out - s.in, 0);
  edl.captions?.forEach((c, i) => {
    if (!(c.end > c.start)) errs.push(`Subtítulo ${i} “${c.text}”: end ≤ start.`);
    if (c.start > total + 0.05) errs.push(`Subtítulo ${i} “${c.text}” fuera de la duración.`);
  });
  edl.overlays?.forEach((o, i) => {
    if (!TYPES.includes(o.type)) errs.push(`Overlay ${i}: tipo desconocido ${o.type}.`);
    if (!(o.end > o.start)) errs.push(`Overlay ${i} (${o.type}): end ≤ start.`);
  });
  edl.sfx?.forEach((s, i) => {
    if (!SFX.includes(s.name)) errs.push(`SFX ${i}: nombre desconocido ${s.name}.`);
  });
  if (errs.length) throw new Error('EDL inválido:\n - ' + errs.join('\n - '));
  return true;
};
