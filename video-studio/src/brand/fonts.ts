import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Tipografías oficiales de Vocare Iuris (confirmadas por el equipo):
 *  - Subtítulos: DM Sans Bold                    → familia 'VI Caption'
 *  - Textos en pantalla: Poppins                 → familia 'VI Card'
 *  - Textos en pantalla de impacto: Druk Wide    → familia 'VI Wide'
 *
 * Druk Wide es comercial (Commercial Type) y no se distribuye con el estudio: se usa el archivo
 * con licencia de Vocare Iuris si existe en public/fonts/ (cualquiera de DRUK_WIDE_FILES).
 * Si no está, se usa Archivo Expanded (variable, ancho 125 %, OFL) como sustituto temporal.
 */
type Face = {family: string; file: string; weight: string; style?: string; stretch?: string; optional?: boolean};

export const DRUK_WIDE_FILES = [
  'fonts/DrukWide-Bold.woff2',
  'fonts/DrukWide-Bold.otf',
  'fonts/DrukWide-Bold.ttf',
  'fonts/DrukWide-Heavy.woff2',
  'fonts/DrukWide-Heavy.otf',
  'fonts/DrukWide-Super.otf',
];

const FACES: Face[] = [
  {family: 'VI Caption', file: 'fonts/dm-sans-latin-700-normal.woff2', weight: '700'},
  {family: 'VI Caption', file: 'fonts/dm-sans-latin-700-italic.woff2', weight: '700', style: 'italic'},
  {family: 'VI Card', file: 'fonts/poppins-latin-600-normal.woff2', weight: '600'},
  {family: 'VI Card', file: 'fonts/poppins-latin-700-normal.woff2', weight: '700'},
  {family: 'VI Card', file: 'fonts/poppins-latin-800-normal.woff2', weight: '800'},
  {family: 'VI Wide Fallback', file: 'fonts/archivo-latin-wdth-normal.woff2', weight: '100 900', stretch: '62% 125%'},
  {family: 'VI Reveal', file: 'fonts/playfair-display-latin-900-normal.woff2', weight: '900'},
  {family: 'VI Serif', file: 'fonts/playfair-display-latin-400-normal.woff2', weight: '400'},
  {family: 'VI Serif', file: 'fonts/playfair-display-latin-700-normal.woff2', weight: '700'},
  ...DRUK_WIDE_FILES.map((file) => ({family: 'VI Wide', file, weight: '700 900', optional: true})),
];

let loaded = false;

/** Carga las fuentes locales (sin red) antes del primer frame. */
export const ensureFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Cargando fuentes Vocare Iuris');
  Promise.allSettled(
    FACES.map(async (f) => {
      const url = staticFile(f.file);
      if (f.optional) {
        // el archivo de Druk Wide puede no existir: comprobar antes de registrarlo
        const r = await fetch(url, {method: 'HEAD'}).catch(() => null);
        if (!r || !r.ok) return;
      }
      const face = new FontFace(f.family, `url(${url})`, {weight: f.weight, style: f.style ?? 'normal', stretch: f.stretch ?? 'normal'});
      const ff = await face.load();
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
    }),
  )
    .then((res) => res.forEach((r, i) => r.status === 'rejected' && !FACES[i].optional && console.error('Fuente no cargada', FACES[i].file, r.reason)))
    .finally(() => continueRender(handle));
};
