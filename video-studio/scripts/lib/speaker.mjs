/**
 * ¿Quién habla en un tramo? Cruza la apertura de boca del presentador (en cámara) con el
 * nivel de audio. En sesiones con una voz detrás de cámara, sólo se montan tramos donde la
 * boca del presentador se mueve mientras suena la voz.
 */

const slice = (arr, a, b) => arr.slice(Math.max(0, a), Math.max(0, b));
const mean = (v) => (v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0);
const std = (v) => {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
};

/** Métricas de un intervalo [s, e] en segundos del footage. */
export const intervalActivity = (act, s, e) => {
  const per = act.step / act.fps;
  const m = slice(act.mouth, Math.floor(s / per), Math.ceil(e / per)).filter((x) => x !== null);
  const r = slice(act.rms, Math.floor(s / act.rmsHop), Math.ceil(e / act.rmsHop));
  // movimiento de labios: variación de la apertura y apertura media
  return {mouthStd: std(m), mouthMean: mean(m), mouthMax: m.length ? Math.max(...m) : 0, rmsDb: mean(r), samples: m.length};
};

/**
 * Clasificación: 'camara' si los labios se mueven claramente; 'detras' si casi no se mueven.
 * Umbrales calibrados con la propia sesión: se compara con la mediana de los tramos.
 */
export const classify = (metrics) => {
  const vals = metrics.map((m) => m.mouthStd).sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)] || 0.01;
  return metrics.map((m) => {
    const ratio = m.mouthStd / med;
    const who = ratio >= 0.6 ? 'camara' : ratio <= 0.35 ? 'detras' : 'dudoso';
    return {...m, ratio: Math.round(ratio * 100) / 100, who};
  });
};
