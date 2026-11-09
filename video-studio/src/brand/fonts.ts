import {continueRender, delayRender, staticFile} from 'remotion';

const faces: Array<[string, string, string, string]> = [
  ['VI Caption', 'fonts/montserrat-latin-800-italic.woff2', '800', 'italic'],
  ['VI Caption', 'fonts/montserrat-latin-900-italic.woff2', '900', 'italic'],
  ['VI Card', 'fonts/inter-latin-600-normal.woff2', '600', 'normal'],
  ['VI Card', 'fonts/inter-latin-700-normal.woff2', '700', 'normal'],
  ['VI Card', 'fonts/inter-latin-800-normal.woff2', '800', 'normal'],
  ['VI Reveal', 'fonts/playfair-display-latin-900-normal.woff2', '900', 'normal'],
];

let loaded = false;

/** Carga las fuentes locales (sin red) antes del primer frame. */
export const ensureFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Cargando fuentes Vocare Iuris');
  Promise.all(
    faces.map(([family, file, weight, style]) => {
      const f = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {weight, style});
      return f.load().then((ff) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff));
    }),
  )
    .catch((e) => console.error('Error cargando fuentes', e))
    .finally(() => continueRender(handle));
};
