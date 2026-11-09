#!/usr/bin/env node
/**
 * PASO 4 — CANVAS VISUAL DE PREVIEW (obligatorio antes de editar)
 * npm run canvas -- <slug> [--no-stills]
 * Genera canvas/<slug>/index.html: página local e interactiva con
 *   A. secuencia narrativa      B. cortes y ritmo (forma de onda + rangos eliminados)
 *   C. encuadres (original vs reencuadre)   D. códigos nativos por momento
 *   E. recursos gráficos (fotogramas REALES renderizados con Remotion)   F. audio
 *   + reproductor que reproduce el footage saltando los cortes y aplicando reencuadres y subtítulos.
 */
import fs from 'node:fs';
import path from 'node:path';
import {frameAt, run} from './lib/ff.mjs';
import {PUBLIC_DIR, STUDIO_ROOT, parseArgs, projectPaths, readJson, writeJson} from './lib/paths.mjs';
import {emojisInEdl, ensureStickers} from './lib/assets.mjs';

const args = parseArgs();
const slug = args._[0];
const P = projectPaths(slug);
const meta = readJson(P.meta);
const edl = readJson(P.edl);
const clean = fs.existsSync(P.cleanup) ? readJson(P.cleanup) : {removed: [], keptPauses: [], flags: [], stats: {}};
const probe = fs.existsSync(P.probe) ? readJson(P.probe) : null;
const codes = readJson(path.join(STUDIO_ROOT, 'templates', 'native-codes.json'));
const brief = fs.existsSync(P.brief) ? fs.readFileSync(P.brief, 'utf8') : '';
ensureStickers(emojisInEdl(edl));

const media = path.join(P.canvasDir, 'media');
fs.mkdirSync(media, {recursive: true});
const proxy = path.join(PUBLIC_DIR, meta.proxy);
const fps = 30;

console.log('→ Proxy de previsualización (540x960)…');
run('ffmpeg', ['-v', 'error', '-y', '-i', proxy, '-vf', 'scale=540:960', '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast', '-g', '6', '-c:a', 'aac', '-b:a', '96k', path.join(media, 'preview.mp4')]);
fs.copyFileSync(path.join(PUBLIC_DIR, 'fonts', 'dm-sans-latin-700-italic.woff2'), path.join(media, 'dm-sans-700-italic.woff2'));
console.log('→ Forma de onda…');
run('ffmpeg', ['-v', 'error', '-y', '-i', proxy, '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=1600x160:colors=0x777777', '-frames:v', '1', path.join(media, 'wave.png')]);

console.log('→ Capturas del encuadre original…');
let tOut = 0;
const segs = edl.segments.map((s) => {
  const mid = (s.in + s.out) / 2;
  const thumb = `orig-${s.id}.jpg`;
  frameAt(proxy, mid, path.join(media, thumb), {width: 360});
  const row = {...s, outStart: tOut, outEnd: tOut + (s.out - s.in), thumb};
  tOut += s.out - s.in;
  return row;
});

if (!args['no-stills']) {
  console.log('→ Fotogramas reales de la composición (Remotion)…');
  const {renderStills} = await import('./lib/stills.mjs');
  // un fotograma por plano + uno por cada recurso gráfico (en su pico de animación)
  const frames = new Set(segs.map((s) => Math.round(((s.outStart + s.outEnd) / 2) * fps)));
  edl.overlays.forEach((o) => frames.add(Math.round((o.start + Math.min(0.7, (o.end - o.start) / 2)) * fps)));
  const files = await renderStills(edl, [...frames].sort((a, b) => a - b), path.join(media, 'stills'), {scale: 0.4});
  segs.forEach((s) => (s.still = `stills/still-${String(Math.round(((s.outStart + s.outEnd) / 2) * fps)).padStart(5, '0')}.jpg`));
  edl.overlays.forEach((o) => (o.still = `stills/still-${String(Math.round((o.start + Math.min(0.7, (o.end - o.start) / 2)) * fps)).padStart(5, '0')}.jpg`));
  console.log(`  ${files.length} fotogramas`);
}

const framingOf = (f) => (typeof f === 'string' ? f : `custom ${f.scale}x`);
const FR = {base: {scale: 1, y: 0}, subtleIn: {scale: 1.08, y: -0.02}, subtleOut: {scale: 1, y: 0}, punchIn: {scale: 1.16, y: -0.04}, crash: {scale: 1.42, y: -0.1}};
const tf = (f) => (typeof f === 'string' ? FR[f] ?? FR.base : {scale: f.scale, y: f.y ?? 0});
const roleLabel = {hook: 'Hook', reveal: 'Revelación', context: 'Contexto', 'legal-basis': 'Base legal', translation: 'Traducción', 'build-up': 'Build-up', twist: 'Giro / pregunta', steps: 'Qué hacer', recap: 'Cierre en bucle', cta: 'CTA'};
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const t2 = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, '0')}`;
const dur = probe?.proxy?.duration ?? edl.source.duration;

const codeRows = [];
segs.forEach((s) => {
  (codes.roleToCodes[s.role] ?? []).forEach((c) => codeRows.push({t: s.outStart, code: codes.codes[c], seg: s}));
  if (s.move === 'crash') codeRows.push({t: s.outStart, code: codes.codes['crash-zoom'], seg: s});
});
edl.overlays.forEach((o) => {
  const c = o.type === 'sticker' || o.type === 'photoCard' || o.type === 'backgroundPlate' ? 'visual-stimulus' : o.type === 'selectionLabel' ? 'editor-ui' : o.type === 'lawCard' || o.type === 'documentCover' ? 'build-up' : o.type === 'revealTitle' ? 'reveal-antihook' : 'pattern-interrupt';
  codeRows.push({t: o.start, code: codes.codes[c], overlay: o});
});
codeRows.sort((a, b) => a.t - b.t);

const overlayDesc = (o) =>
  ({
    sticker: `Sticker ${o.emoji}`,
    lawCard: `Tarjeta de norma «${o.title}${o.subtitle ? ' — ' + o.subtitle : ''}»`,
    selectionLabel: `Etiqueta seleccionada «${o.text}»`,
    documentCover: `Portada de documento ${o.label ?? ''}`,
    logoBadge: `Logo ${o.label ?? ''}`,
    photoCard: 'Foto de apoyo',
    backgroundPlate: 'Imagen de fondo',
    bigLetter: `Letra gigante «${o.text}»`,
    kineticWord: `Palabra cinética «${(o.syllables ?? []).join('·')}»`,
    revealTitle: `Título de revelación «${(o.lines ?? []).join(' ')}»`,
    textBadge: `Badge «${o.text}»`,
    denyMark: 'Aspa roja (negación)',
    verdictStamp: `Sello «${o.text}»`,
    stepList: `Pasos: ${(o.steps ?? []).join(' → ')}`,
    comparison: `Comparación ${o.left?.label} vs ${o.right?.label}`,
    emojiEquation: `Ecuación ${(o.items ?? []).join(' ')}`,
  })[o.type] ?? o.type;

const keptRanges = edl.segments.map((s) => ({in: s.in, out: s.out}));
const playerData = {
  segments: segs.map((s) => ({in: s.in, out: s.out, outStart: s.outStart, scale: tf(s.framing).scale, y: tf(s.framing).y, move: s.move, role: s.role})),
  captions: edl.captions,
  overlays: edl.overlays.map((o) => ({start: o.start, end: o.end, label: overlayDesc(o)})),
};

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Canvas · ${esc(edl.title)}</title>
<style>
:root{--bg:#f6f4f0;--card:#fff;--ink:#16161a;--mut:#6b6b72;--line:#e3dfd8;--y:#ffe61b;--red:#e5252a;--green:#1f9d55;--blue:#4c7bf2}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#121214;--card:#1c1c20;--ink:#f2f2f2;--mut:#a0a0a8;--line:#2c2c33}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif}
header{padding:28px 20px 8px;max-width:1280px;margin:auto}h1{margin:0;font-size:28px}h2{font-size:20px;margin:36px 0 12px;border-bottom:2px solid var(--y);display:inline-block}
main{max-width:1280px;margin:auto;padding:0 20px 80px}.pill{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;background:var(--line);margin-right:6px}
.status{background:#fff3c4;color:#5b4a00;padding:10px 14px;border-radius:10px;margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}
.seg h3{margin:4px 0;font-size:14px}.seg .txt{font-size:13px;color:var(--mut);min-height:40px}
.frames{display:flex;gap:6px}.frames figure{margin:0;flex:1}.frames figcaption{font-size:11px;color:var(--mut);text-align:center}
.crop{width:100%;aspect-ratio:9/16;overflow:hidden;border-radius:8px;background:#000}.crop img{width:100%;height:100%;object-fit:cover;transform-origin:50% 32%}
.role{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em}.role.hook,.role.reveal{color:var(--red)}.role.cta{color:var(--green)}
.timeline{position:relative;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px}.timeline img{width:100%;height:110px;display:block;opacity:.9}
.bar{position:absolute;top:10px;height:110px}.bar.keep{background:rgba(31,157,85,.18);border-left:1px solid rgba(31,157,85,.6)}
.removed{color:var(--red)}table{width:100%;border-collapse:collapse;background:var(--card);border-radius:12px;overflow:hidden}td,th{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:13px}th{background:var(--line)}
.player{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:20px}.stage{position:relative;aspect-ratio:9/16;overflow:hidden;border-radius:14px;background:#000}
.stage video{width:100%;height:100%;object-fit:cover;transform-origin:50% 32%;transition:none}
@font-face{font-family:'DM Sans';font-weight:700;font-style:italic;src:url(media/dm-sans-700-italic.woff2)}
.cap{position:absolute;left:0;right:0;top:21.5%;text-align:center;font:italic 700 26px 'DM Sans',sans-serif;color:#ffe61b;-webkit-text-stroke:2px #D9A800;paint-order:stroke fill;text-shadow:0 0 6px #ffdd00,0 0 14px #ffdd00,0 2px 2px #3c2800}
.ov{position:absolute;left:8px;right:8px;bottom:12%;text-align:center;font-size:13px;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:4px 6px}
button{font:inherit;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}button.primary{background:var(--ink);color:var(--bg)}
.stills{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.stills figure{margin:0}.stills img{width:100%;border-radius:8px}.stills figcaption{font-size:12px;color:var(--mut)}
@media (max-width:720px){.player{grid-template-columns:1fr}}
</style></head><body>
<header>
<div class="pill">Vocare Iuris Video Studio</div><div class="pill">Canvas de preview</div>
<h1>${esc(edl.title)}</h1>
<div class="status">Estado: <b>${meta.approval?.approved ? 'APROBADO ' + esc(meta.approval.approvedAt ?? '') : 'PENDIENTE DE APROBACIÓN'}</b> — la edición definitiva no se ejecuta hasta aprobar la dirección creativa.</div>
<p>Original ${dur.toFixed(2)} s → edición <b>${tOut.toFixed(2)} s</b> · ${edl.segments.length} planos · ${edl.captions.length} subtítulos · ${edl.overlays.length} recursos · ${edl.sfx.length} SFX · color: <b>${esc(edl.colorPreset)}</b></p>
</header><main>

<h2>Reproductor del corte</h2>
<div class="player"><div><div class="stage"><video id="v" src="media/preview.mp4" playsinline preload="auto"></video><div class="cap" id="cap"></div><div class="ov" id="ov" hidden></div></div>
<p><button class="primary" id="play">▶ Reproducir edición</button> <button id="orig">Ver original</button></p></div>
<div><p>Reproduce el footage original <b>saltando los cortes</b>, aplicando el <b>reencuadre</b> de cada plano y el <b>subtítulo</b> palabra a palabra. Los recursos gráficos se indican en la franja inferior; su aspecto real está en la sección E.</p>
<p class="removed">Rojo en la forma de onda = material eliminado. Verde = material que se conserva.</p>
<table><tr><th>Ritmo</th><td>${clean.stats.wordsPerSecond ?? '—'} palabras/s (referencias 3.2–3.6)</td></tr>
<tr><th>Ahorro</th><td>${(dur - tOut).toFixed(2)} s eliminados</td></tr>
<tr><th>Pausas conservadas</th><td>${clean.keptPauses.map((p) => `${p.at.toFixed(2)} s (${p.reason})`).join(', ') || '—'}</td></tr></table></div></div>

<h2>A · Secuencia narrativa</h2>
<table><tr><th>#</th><th>Función</th><th>Original</th><th>En edición</th><th>Dur.</th><th>Texto</th></tr>
${segs.map((s, i) => `<tr><td>${i + 1}</td><td class="role ${s.role}">${roleLabel[s.role] ?? s.role ?? ''}</td><td>${t2(s.in)}–${t2(s.out)}</td><td>${t2(s.outStart)}</td><td>${(s.out - s.in).toFixed(2)} s</td><td>${esc(s.note ?? '')}</td></tr>`).join('')}
</table>

<h2>B · Cortes y ritmo</h2>
<div class="timeline"><img src="media/wave.png" alt="forma de onda">${keptRanges.map((r) => `<div class="bar keep" style="left:calc(10px + (100% - 20px) * ${r.in / dur});width:calc((100% - 20px) * ${(r.out - r.in) / dur})"></div>`).join('')}</div>
<table><tr><th>Tiempo original</th><th>Tipo</th><th>Detalle</th></tr>
${clean.removed.map((r) => `<tr><td>${t2(r.from)}–${t2(r.to)}</td><td class="removed">${({silence: 'Silencio', filler: 'Muletilla', retake: 'Toma repetida', stutter: 'Repetición'})[r.kind] ?? r.kind}</td><td>${esc(r.text)}${r.keptAt ? ` (se conserva la toma de ${t2(r.keptAt)})` : ''}</td></tr>`).join('') || '<tr><td colspan=3>Sin cortes</td></tr>'}
</table>
${clean.flags?.length ? `<p><b>Para revisión manual:</b> ${clean.flags.map((f) => `${t2(f.at)} “${esc(f.text)}” (${f.kind})`).join(' · ')}</p>` : ''}

<h2>C · Encuadres</h2>
<div class="grid">${segs.map((s, i) => `<div class="card seg"><div class="role ${s.role}">${i + 1}. ${roleLabel[s.role] ?? ''}</div><h3>${esc(framingOf(s.framing))}${s.move !== 'none' ? ' · ' + s.move : ''}</h3>
<div class="frames"><figure><div class="crop"><img src="media/${s.thumb}"></div><figcaption>Original</figcaption></figure>
<figure><div class="crop"><img src="media/${s.thumb}" style="transform:translateY(${tf(s.framing).y * 100}%) scale(${tf(s.framing).scale})"></div><figcaption>Reencuadre ${tf(s.framing).scale}x</figcaption></figure></div>
<div class="txt">${esc(s.note ?? '')}</div></div>`).join('')}</div>

<h2>D · Códigos nativos</h2>
<table><tr><th>Momento</th><th>Código</th><th>Fuente</th><th>Función narrativa</th><th>Objetivo de retención</th></tr>
${codeRows.map((r) => `<tr><td>${t2(r.t)}</td><td><b>${esc(r.code.name)}</b>${r.overlay ? '<br><small>' + esc(overlayDesc(r.overlay)) + '</small>' : ''}</td><td>${r.code.source.join(' + ')}</td><td>${esc(r.code.function)}</td><td>${esc(r.code.retention)}</td></tr>`).join('')}
</table>

<h2>E · Recursos gráficos (fotogramas reales del render)</h2>
<div class="stills">${segs.filter((s) => s.still).map((s) => `<figure><img src="media/${s.still}"><figcaption>${t2(s.outStart)} · ${roleLabel[s.role] ?? ''}</figcaption></figure>`).join('')}</div>
<h3>Recursos</h3>
<div class="stills">${edl.overlays.map((o) => `<figure>${o.still ? `<img src="media/${o.still}">` : ''}<figcaption>${t2(o.start)}–${t2(o.end)} · ${esc(overlayDesc(o))}${o.note ? '<br>⚠️ ' + esc(o.note) : ''}</figcaption></figure>`).join('') || '<p>Sin recursos gráficos.</p>'}</div>

<h2>F · Audio y tonalidad</h2>
<table>
<tr><th>Voz</th><td>Sin procesamiento artificial de tono. Normalización a −14 LUFS (true peak −1 dBTP) en exportación. Micro-fundidos de 1 frame en cada corte para evitar clics. Original: ${probe ? probe.audio.integratedLufs + ' LUFS' : '—'}.</td></tr>
<tr><th>Música</th><td>${edl.music ? esc(edl.music.file) + ' a ' + edl.music.volumeDb + ' dB' : 'Sin música (las referencias no muestran cama musical constante verificable).'}</td></tr>
<tr><th>SFX</th><td>${edl.sfx.map((s) => `${t2(s.at)} ${s.name} (${s.volumeDb} dB)`).join(' · ') || '—'}</td></tr>
<tr><th>Ritmo</th><td>Hueco máximo entre palabras ${'0.30'} s; pausas dramáticas ≤ 0.45 s sólo antes de veredicto o tras pregunta.</td></tr>
</table>

<h2>Brief</h2><pre style="white-space:pre-wrap;background:var(--card);padding:14px;border-radius:12px;border:1px solid var(--line)">${esc(brief)}</pre>
</main>
<script>
const D=${JSON.stringify(playerData)};
const v=document.getElementById('v'),cap=document.getElementById('cap'),ov=document.getElementById('ov');
let mode='edit',i=0;
function lower(w){return /^[A-ZÁÉÍÓÚÑ0-9]{2,}$/.test(w)?w:w.toLowerCase()}
function tick(){
  if(mode==='edit'){const s=D.segments[i];if(!s)return;
    if(v.currentTime>=s.out-0.01){i++;const n=D.segments[i];if(!n){v.pause();return}v.currentTime=n.in}
    const c=D.segments[i];const local=v.currentTime-c.in;const tOut=c.outStart+local;
    let sc=c.scale;if(c.move==='settle')sc*=1+0.06*Math.max(0,1-local/0.33);if(c.move==='crash')sc=1+(c.scale-1)*Math.min(1,local/0.25);
    v.style.transform='translateY('+(c.y*100)+'%) scale('+sc+')';
    const cw=D.captions.find(x=>tOut>=x.start&&tOut<x.end);cap.textContent=cw?lower(cw.text):'';cap.style.fontSize=cw&&cw.emphasis?'29px':'26px';
    const o=D.overlays.find(x=>tOut>=x.start&&tOut<x.end);ov.hidden=!o;if(o)ov.textContent='▣ '+o.label;
  }
  if(!v.paused)requestAnimationFrame(tick);
}
document.getElementById('play').onclick=()=>{mode='edit';i=0;v.currentTime=D.segments[0].in;v.play();requestAnimationFrame(tick)};
document.getElementById('orig').onclick=()=>{mode='orig';v.style.transform='none';cap.textContent='';ov.hidden=true;v.currentTime=0;v.play()};
</script></body></html>`;

fs.writeFileSync(path.join(P.canvasDir, 'index.html'), html);
meta.status = 'canvas-listo';
writeJson(P.meta, meta);
console.log(`✓ Canvas: canvas/${slug}/index.html  (ábrelo en el navegador; espera aprobación antes de: npm run render -- ${slug})`);
