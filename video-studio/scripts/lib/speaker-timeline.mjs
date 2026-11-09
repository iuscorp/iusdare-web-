/** Línea de tiempo de quién habla: N = presentador (voz + labios), d = voz sin labios (detrás), . = silencio */
export const speakerTimeline = (act, a, b, step = 0.25, {voiceDb = -47, mouthThr = 0.012} = {}) => {
  const per = act.step / act.fps;
  let s = '';
  for (let t = a; t < b; t += step) {
    const r = act.rms.slice(Math.floor(t / act.rmsHop), Math.ceil((t + step) / act.rmsHop));
    const db = r.length ? Math.max(...r) : -99;
    const m = act.mouth.slice(Math.floor((t - 0.1) / per), Math.ceil((t + step + 0.1) / per)).filter((x) => x !== null);
    const mv = m.length ? Math.max(...m) - Math.min(...m) : 0;
    const open = m.length ? Math.max(...m) : 0;
    s += db < voiceDb ? '.' : mv > mouthThr || open > 0.03 ? 'N' : 'd';
  }
  return s;
};
