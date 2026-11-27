/**
 * PASO 4 — CANVAS VISUAL DE LA PREVIEW DE EDICIÓN (obligatorio)
 *
 * npm run studio:canvas -- <slug> [--no-inline] [--strip 1.5]
 *
 * Builds canvas/<slug>/index.html from edit.json using REAL captures:
 *   - original frame of the raw at each segment (encuadre original)
 *   - the actual Remotion composition rendered at that moment (reencuadre +
 *     captions + motion graphics + b-roll), so the canvas shows the edit as it
 *     will look, not a mock-up
 *   - one still per graphic and per b-roll slot, the end card, and a filmstrip
 * Sections: Vista general · A Secuencia narrativa · B Cortes y encuadres ·
 * C Códigos nativos · D B-roll · E Textos y MG · F Audio y ritmo · Validación.
 */
import fs from "node:fs";
import path from "node:path";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { arg, browserExecutable, extractFrame, flag, getBundle, loadEdit, mediaPath, p, positional, projectDir, readJson, tc } from "./lib/common";
import { buildTimeline, mapRange } from "../src/lib/timeline";
import { scaleOf } from "../src/framing/presets";
import type { Edit } from "../src/schema/edit";
import { codeInfo, roleInfo } from "./lib/vocab";

const slug = positional()[0] ?? (() => { throw new Error("Uso: npm run studio:canvas -- <slug>"); })();
const edit: Edit = loadEdit(slug);
const tl = buildTimeline(edit);
const fps = tl.fps;
const outDir = p("canvas", slug);
const imgDir = path.join(outDir, "img");
fs.rmSync(imgDir, { recursive: true, force: true });
fs.mkdirSync(imgDir, { recursive: true });
const inline = !flag("no-inline");
const stripEvery = Number(arg("strip", "1.5"));

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const img = (file: string, alt = "") => {
  const src = inline ? `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}` : `img/${path.basename(file)}`;
  return `<img src="${src}" alt="${esc(alt)}" loading="lazy">`;
};
const spoken = (src: string, a: number, b: number) =>
  edit.captions.words.filter((w) => edit.captions.source === src && w.s >= a - 0.05 && w.s < b).map((w) => edit.captions.replace[w.w] ?? w.w).join(" ");

(async () => {
  const serveUrl = await getBundle();
  const exe = browserExecutable();
  const browser = await openBrowser("chrome", { browserExecutable: exe ?? undefined });
  const inputProps = { edit, hud: false };
  const composition = await selectComposition({ serveUrl, id: "RevoredoReel", inputProps, puppeteerInstance: browser, browserExecutable: exe });

  let n = 0;
  const still = async (frame: number, name: string) => {
    const f = Math.max(0, Math.min(tl.totalFrames - 1, Math.round(frame)));
    const output = path.join(imgDir, `${name}.jpg`);
    await renderStill({ composition, serveUrl, frame: f, output, inputProps, imageFormat: "jpeg", jpegQuality: 80, scale: 0.4, puppeteerInstance: browser, browserExecutable: exe, overwrite: true });
    process.stdout.write(`\r• Capturas renderizadas: ${++n}`);
    return output;
  };

  // Segment captures: original raw frame + rendered frame (after entrances settle)
  const segShots: { orig: string; out: string }[] = [];
  for (const s of tl.segments) {
    const mid = s.in + (s.out - s.in) * 0.55;
    const orig = path.join(imgDir, `seg-${s.id}-orig.jpg`);
    extractFrame(mediaPath(edit.sources[s.source]), mid, orig, 432);
    const out = await still(s.startFrame + s.durationInFrames * 0.55, `seg-${s.id}-out`);
    segShots.push({ orig, out });
  }
  const gShots: Record<string, string> = {};
  for (const g of edit.graphics) {
    const r = mapRange(tl, g);
    if (r) gShots[g.id] = await still(r.from + Math.min(r.durationInFrames - 2, Math.max(18, r.durationInFrames * 0.6)), `mg-${g.id}`);
  }
  const bShots: Record<string, string> = {};
  for (const b of edit.broll) {
    const r = mapRange(tl, b);
    if (r) bShots[b.id] = await still(r.from + r.durationInFrames / 2, `br-${b.id}`);
  }
  const endShot = tl.endCardFrames ? await still(tl.bodyFrames + tl.endCardFrames * 0.7, "endcard") : null;
  const strip: { f: number; file: string }[] = [];
  for (let f = Math.round(fps * 0.5); f < tl.totalFrames; f += Math.round(stripEvery * fps)) strip.push({ f, file: await still(f, `strip-${String(f).padStart(5, "0")}`) });
  await browser.close({ silent: true });
  console.log("");

  // Analysis (optional)
  const anaFile = path.join(projectDir(slug), "analysis", "analysis.json");
  const ana = fs.existsSync(anaFile) ? readJson<{ sources: Record<string, { tech: { width: number; height: number; fps: number; duration: number }; loudness: { integratedLufs: number; truePeakDb: number }; flags: string[] }> }>(anaFile) : null;

  // Metrics
  const total = tl.totalFrames / fps;
  const body = tl.bodyFrames / fps;
  const rawDur = ana?.sources?.main?.tech.duration;
  const shotLens = tl.segments.map((s) => s.durationInFrames / fps);
  const brollFrames = edit.broll.map((b) => mapRange(tl, b)?.durationInFrames ?? 0).reduce((a, b) => a + b, 0);
  // Visual changes = cuts + b-roll in/out + graphic entrances
  const changes =
    tl.segments.length - 1 + edit.broll.filter((b) => mapRange(tl, b)).length * 2 + edit.graphics.filter((g) => mapRange(tl, g)).length;
  const avgChange = body / Math.max(1, changes);
  const pct = (f: number) => ((f / tl.totalFrames) * 100).toFixed(3);

  const track = (items: { from: number; dur: number; label: string; cls: string; title: string }[]) =>
    items.map((i) => `<div class="blk ${i.cls}" style="left:${pct(i.from)}%;width:${pct(i.dur)}%" title="${esc(i.title)}"><span>${esc(i.label)}</span></div>`).join("");

  const segTrack = track(tl.segments.map((s) => ({ from: s.startFrame, dur: s.durationInFrames, label: s.id, cls: `r-${s.role}`, title: `${s.id} · ${roleInfo[s.role].label} · ${s.framing.preset}` })));
  const brTrack = track(edit.broll.flatMap((b) => { const r = mapRange(tl, b); return r ? [{ from: r.from, dur: r.durationInFrames, label: b.id, cls: "t-broll", title: `${b.id} · ${b.concept}` }] : []; }));
  const gTrack = track(edit.graphics.flatMap((g) => { const r = mapRange(tl, g); return r ? [{ from: r.from, dur: r.durationInFrames, label: g.component, cls: `t-mg f-${g.function}`, title: `${g.id} · ${g.component}` }] : []; }));
  const endTrack = tl.endCardFrames ? track([{ from: tl.bodyFrames, dur: tl.endCardFrames, label: "CTA", cls: "r-cta", title: "End card" }]) : "";
  const ticks = Array.from({ length: Math.floor(total / 5) + 1 }, (_, i) => `<div class="tick" style="left:${pct(i * 5 * fps)}%">${i * 5}s</div>`).join("");

  const loop = (["hook", "context", "tension", "development", "reveal", "resolution", "cta"] as const)
    .map((r) => ({ r, segs: tl.segments.filter((s) => s.role === r) }))
    .filter((x) => x.segs.length || x.r === "cta")
    .map((x) => `<div class="loop-step r-${x.r}"><b>${esc(roleInfo[x.r].label)}</b><small>${esc(roleInfo[x.r].question)}</small><em>${x.segs.map((s) => s.id).join(" · ") || (tl.endCardFrames ? "End card" : "—")}</em></div>`)
    .join('<div class="arrow">→</div>');

  const secA = tl.segments
    .map((s, i) => `<tr><td class="mono">${s.id}</td><td><span class="pill r-${s.role}">${esc(roleInfo[s.role].label)}</span></td><td class="mono">${tc(s.in)} → ${tc(s.out)}</td><td class="mono">${tc(s.startFrame / fps)}</td><td class="mono">${shotLens[i].toFixed(2)} s</td><td>${esc(s.purpose)}</td><td class="quote">“${esc(spoken(s.source, s.in, s.out))}”</td></tr>`)
    .join("");

  const secB = tl.segments
    .map((s, i) => {
      const prev = tl.segments[i - 1];
      const scaleJump = prev ? Math.abs(scaleOf(s.framing) - scaleOf(prev.framing)) : 0;
      const warn = prev && scaleJump < 0.06 && prev.source === s.source && s.transitionIn === "cut" && !edit.broll.some((b) => { const r = mapRange(tl, b); return r && r.from <= s.startFrame && r.from + r.durationInFrames >= s.startFrame; }) ? `<p class="warn">⚠ Corte sin cambio de escala respecto a ${prev.id}: riesgo de jump-cut.</p>` : "";
      return `<article class="shot"><header><b>${s.id}</b> <span class="pill r-${s.role}">${esc(roleInfo[s.role].label)}</span> <span class="mono">${tc(s.in)}–${tc(s.out)}</span></header>
      <div class="pair"><figure>${img(segShots[i].orig, "original")}<figcaption>Original</figcaption></figure><figure>${img(segShots[i].out, "propuesta")}<figcaption>Propuesta</figcaption></figure></div>
      <dl><dt>Entrada</dt><dd>${s.transitionIn === "cut" ? "Corte directo" : esc(s.transitionIn)}</dd><dt>Encuadre</dt><dd>${esc(s.framing.preset)} · ×${scaleOf(s.framing).toFixed(2)}</dd><dt>Zoom</dt><dd>${s.framing.zoomFrom === s.framing.zoomTo ? "estático" : `${s.framing.zoomFrom} → ${s.framing.zoomTo} (${s.framing.easing})`}</dd><dt>Foco</dt><dd>${s.framing.focusX.toFixed(2)}, ${s.framing.focusY.toFixed(2)}</dd></dl>${warn}</article>`;
    })
    .join("");

  const secC = tl.segments
    .filter((s) => s.nativeCodes.length)
    .map((s) => `<tr><td class="mono">${s.id}<br><small>${tc(s.startFrame / fps)}</small></td><td>${s.nativeCodes.map((c) => `<span class="code">${esc(codeInfo[c].label)}</span>`).join(" ")}</td><td>${esc(s.rationale)}</td><td><small>${s.nativeCodes.map((c) => esc(codeInfo[c].solves)).join("<br>")}</small></td><td><small>${s.nativeCodes.map((c) => esc(codeInfo[c].corporate)).join("<br>")}</small></td></tr>`)
    .join("");

  const secD = edit.broll.length
    ? edit.broll
        .map((b) => {
          const r = mapRange(tl, b);
          return `<article class="br">${bShots[b.id] ? img(bShots[b.id], b.id) : '<div class="cut-out">Fuera del corte</div>'}<div><header><b>${b.id}</b> <span class="mono">${r ? `${tc(r.from / fps)} → ${tc((r.from + r.durationInFrames) / fps)}` : "—"}</span> <span class="status ${b.src ? "ok" : "pending"}">${b.src ? "Seleccionado" : "Por buscar"}</span></header>
          <p class="quote">“${esc(b.phrase)}”</p><dl><dt>Concepto</dt><dd>${esc(b.concept)}</dd><dt>Función</dt><dd>${esc(b.function)}</dd><dt>Recurso</dt><dd>${esc(b.description)}</dd><dt>Búsqueda</dt><dd>${esc(b.searchQuery) || "—"}</dd><dt>Fuente</dt><dd>${esc(b.provider)}${b.license ? ` · ${esc(b.license)}` : ""}</dd><dt>Layout</dt><dd>${esc(b.layout)} · grade ${esc(b.grade)}</dd><dt>Raw</dt><dd class="mono">${tc(b.start)}–${tc(b.end)} (${b.clock})</dd></dl></div></article>`;
        })
        .join("")
    : `<p class="warn">⚠ Sin B-roll definido. El B-roll es obligatorio en el lenguaje Revoredo.</p>`;

  const gText = (g: Edit["graphics"][number]) => {
    const pr = g.props as Record<string, unknown>;
    return [pr.kicker, pr.text, pr.prefix !== undefined ? `${pr.prefix ?? ""}${pr.value}${pr.suffix ?? ""}` : null, pr.label, pr.title, Array.isArray(pr.items) ? (pr.items as string[]).join(" · ") : null, pr.reference, pr.authority, pr.quote, pr.name, pr.role, pr.line, pr.caption, Array.isArray(pr.parts) ? (pr.parts as {key:string;label:string}[]).map((x) => `${x.key} = ${x.label}`).join(" · ") : null].filter(Boolean).map((x) => esc(x)).join("<br>");
  };
  const secE = edit.graphics
    .map((g) => {
      const r = mapRange(tl, g);
      return `<article class="mg">${gShots[g.id] ? img(gShots[g.id], g.id) : '<div class="cut-out">Fuera del corte</div>'}<div><header><b>${g.id}</b> · ${esc(g.component)} <span class="pill f-${g.function}">${esc(g.function)}</span></header><p class="mono">${r ? `${tc(r.from / fps)} → ${tc((r.from + r.durationInFrames) / fps)}` : "—"}</p><p class="gtext">${gText(g)}</p><p><small>${esc(g.rationale)}</small></p></div></article>`;
    })
    .join("");

  const emphasisMoments = edit.graphics.filter((g) => g.function === "enfasis").length + tl.segments.filter((s) => s.nativeCodes.includes("punch-in")).length;
  const rhythm = tl.segments.map((s, i) => `<div class="bar r-${s.role}" style="height:${Math.min(100, (shotLens[i] / Math.max(...shotLens)) * 100)}%" title="${s.id} ${shotLens[i].toFixed(2)} s"><span>${shotLens[i].toFixed(1)}</span></div>`).join("");
  const sfx = edit.audio.sfx.map((x) => `<li><span class="mono">${tc(x.at)}</span> ${esc(path.basename(x.src))} · vol ${x.volume} — ${esc(x.why)}</li>`).join("") || "<li>Sin efectos sonoros.</li>";
  const m = edit.audio.music;
  const flags = ana ? Object.values(ana.sources).flatMap((s) => s.flags) : [];

  const filmstrip = strip.map((s) => `<figure>${img(s.file)}<figcaption>${tc(s.f / fps)}</figcaption></figure>`).join("");
  const segStrip = segShots.map((s, i) => `<figure>${img(s.out)}<figcaption>${tl.segments[i].id} · ${tc(tl.segments[i].startFrame / fps)}</figcaption></figure>`).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Canvas de edición · ${esc(edit.meta.title)}</title>
<style>
:root{--bg:#F5F3EF;--panel:#FFFFFF;--ink:#111214;--muted:#5B6168;--line:rgba(17,18,20,.12);--gold:#B9832A;--gold-bg:rgba(233,169,59,.16);--warn:#A4432F;--ok:#3F7A53;
--hook:#E9A93B;--context:#6E8590;--tension:#C8553D;--development:#4F6D8F;--reveal:#8A6BB8;--resolution:#6E9F7B;--cta:#111214;}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0E0F11;--panel:#17181B;--ink:#F2F0EC;--muted:#9AA1A8;--line:rgba(255,255,255,.12);--gold:#E9A93B;--gold-bg:rgba(233,169,59,.14);--warn:#E07A62;--ok:#7FBF92;--cta:#F2F0EC;}}
:root[data-theme=dark]{--bg:#0E0F11;--panel:#17181B;--ink:#F2F0EC;--muted:#9AA1A8;--line:rgba(255,255,255,.12);--gold:#E9A93B;--gold-bg:rgba(233,169,59,.14);--warn:#E07A62;--ok:#7FBF92;--cta:#F2F0EC;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Lato,Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
header.top{padding:40px 16px 24px;max-width:1240px;margin:auto}h1{font:400 clamp(30px,5vw,52px)/1.05 "Instrument Serif",Georgia,serif;margin:6px 0 10px}
.kicker{letter-spacing:.22em;text-transform:uppercase;font-size:12px;color:var(--gold);font-weight:600}
nav{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);overflow-x:auto;white-space:nowrap}nav div{max-width:1240px;margin:auto;padding:10px 16px;display:flex;gap:18px}nav a{color:var(--muted);text-decoration:none;font-size:13px}nav a:hover{color:var(--ink)}
section{max-width:1240px;margin:auto;padding:36px 16px;border-bottom:1px solid var(--line)}h2{font:400 32px/1.1 "Instrument Serif",Georgia,serif;margin:0 0 6px}h2 b{color:var(--gold);font-weight:400;margin-right:8px}.lead{color:var(--muted);margin:0 0 22px;max-width:760px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}.stat b{display:block;font:400 30px/1 "Instrument Serif",Georgia,serif}.stat small{color:var(--muted)}
.timeline{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 14px 26px;overflow-x:auto}.tl-inner{min-width:760px;position:relative}.row{position:relative;height:30px;margin:6px 0 6px 74px;background:rgba(127,127,127,.07);border-radius:6px}.row::before{content:attr(data-label);position:absolute;left:-74px;top:6px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
.blk{position:absolute;top:2px;bottom:2px;border-radius:5px;overflow:hidden;color:#fff;font-size:11px;padding:5px 6px;white-space:nowrap}.blk span{opacity:.95}.ticks{position:relative;height:16px;margin-left:74px}.tick{position:absolute;font-size:10px;color:var(--muted);transform:translateX(-50%)}
.r-hook{background:var(--hook)}.r-context{background:var(--context)}.r-tension{background:var(--tension)}.r-development{background:var(--development)}.r-reveal{background:var(--reveal)}.r-resolution{background:var(--resolution)}.r-cta{background:var(--cta);color:var(--bg)}
.t-broll{background:#2E6F86}.t-mg{background:#7A6A4F}.f-enfasis.t-mg{background:#A77A2C}.f-retencion.t-mg{background:#6B5A8E}
.pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;color:#fff;font-weight:600;letter-spacing:.03em}.pill.f-comprension{background:#4F6D8F}.pill.f-enfasis{background:#A77A2C}.pill.f-retencion{background:#6B5A8E}
.loop{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;margin:18px 0}.loop-step{flex:1 1 140px;border-radius:12px;padding:12px;color:#fff;display:flex;flex-direction:column;gap:4px}.loop-step small{opacity:.85;font-size:12px}.loop-step em{font-style:normal;font-family:ui-monospace,monospace;font-size:12px}.arrow{align-self:center;color:var(--muted)}
.strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}.strip figure{margin:0;flex:0 0 auto;width:120px}.strip img{width:120px;border-radius:8px;display:block}.strip figcaption{font-size:11px;color:var(--muted);text-align:center;font-family:ui-monospace,monospace}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:14px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600}.table-wrap{overflow-x:auto}
.mono{font-family:ui-monospace,"SFMono-Regular",monospace;font-size:12.5px;white-space:nowrap}.quote{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:17px;line-height:1.3}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:16px}.grid.wide{grid-template-columns:repeat(auto-fill,minmax(min(100%,470px),1fr))}.br>div,.mg>div{min-width:0}dd{overflow-wrap:anywhere}.shot,.br,.mg{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}.shot header,.br header,.mg header{margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pair figure{margin:0}.pair img,.br img,.mg img{width:100%;border-radius:8px;display:block}figcaption{font-size:11px;color:var(--muted);text-align:center;margin-top:4px}
.br,.mg{display:grid;grid-template-columns:150px 1fr;gap:14px}.br img,.mg img{width:150px}dl{display:grid;grid-template-columns:90px 1fr;gap:4px 10px;margin:10px 0 0;font-size:13px}dt{color:var(--muted)}dd{margin:0}
.code{display:inline-block;background:var(--gold-bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:1px 7px;font-size:12px;margin:2px 0}.warn{color:var(--warn);font-size:13px}.status{font-size:11px;padding:2px 8px;border-radius:99px;border:1px solid}.status.ok{color:var(--ok)}.status.pending{color:var(--warn)}
.gtext{font-family:"Instrument Serif",Georgia,serif;font-size:18px;line-height:1.25}.cut-out{width:150px;aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:12px}
.rhythm{display:flex;align-items:flex-end;gap:4px;height:160px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}.bar{flex:1;border-radius:4px 4px 0 0;position:relative;min-width:14px}.bar span{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:10px;color:var(--muted)}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.box{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}.box h3{margin:0 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.check li{margin:6px 0;list-style:none}.check{padding:0}.check input{margin-right:8px;accent-color:#E9A93B}
.story{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.story div{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}.story small{display:block;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;font-size:11px;margin-bottom:4px}
@media (max-width:560px){.br,.mg{grid-template-columns:1fr}.br img,.mg img,.cut-out{width:100%}.pair{grid-template-columns:1fr 1fr}}
</style></head><body>
<header class="top"><div class="kicker">Revoredo Abogados Video Studio · Canvas de preview</div><h1>${esc(edit.meta.title)}</h1>
<p class="lead">Proyecto <span class="mono">${esc(slug)}</span> · estado <b>${esc(edit.meta.status)}</b> · generado ${new Date().toLocaleString("es-PE")}. Todas las capturas “Propuesta” son renders reales de la composición Remotion sobre el raw.</p></header>
<nav><div><a href="#overview">Vista general</a><a href="#a">A · Secuencia</a><a href="#b">B · Cortes y encuadres</a><a href="#c">C · Códigos nativos</a><a href="#d">D · B-roll</a><a href="#e">E · Textos y MG</a><a href="#f">F · Audio y ritmo</a><a href="#ok">Validación</a></div></nav>

<section id="overview"><h2>Vista general</h2><p class="lead">Duración, densidad de estímulos y estructura del loop de retención.</p>
<div class="stats"><div class="stat"><b>${total.toFixed(1)} s</b><small>Duración final${rawDur ? ` (raw ${rawDur.toFixed(1)} s)` : ""}</small></div><div class="stat"><b>${tl.segments.length}</b><small>Segmentos · ${tl.segments.length - 1} cortes</small></div><div class="stat"><b>${(body / tl.segments.length).toFixed(2)} s</b><small>Plano medio</small></div><div class="stat"><b>${avgChange.toFixed(2)} s</b><small>Cada cuánto cambia la imagen</small></div><div class="stat"><b>${((brollFrames / tl.bodyFrames) * 100).toFixed(0)}%</b><small>Cobertura B-roll (${edit.broll.length} recursos)</small></div><div class="stat"><b>${edit.graphics.length}</b><small>Textos / MG</small></div></div>
<div class="story"><div><small>Problema</small>${esc(edit.story.problem)}</div><div><small>Por qué importa</small>${esc(edit.story.whyItMatters)}</div><div><small>Riesgo / oportunidad</small>${esc(edit.story.riskOrOpportunity)}</div><div><small>Pregunta abierta</small>${esc(edit.story.openQuestion)}</div><div><small>Payoff</small>${esc(edit.story.payoff)}</div><div><small>CTA</small>${esc(edit.story.cta)}</div></div>
<div class="loop">${loop}</div>
<div class="timeline"><div class="tl-inner"><div class="row" data-label="Presentador">${segTrack}${endTrack}</div><div class="row" data-label="B-roll">${brTrack}</div><div class="row" data-label="Textos/MG">${gTrack}</div><div class="ticks">${ticks}</div></div></div>
<h3 style="margin-top:24px">Capturas por segmento</h3><div class="strip">${segStrip}${endShot ? `<figure>${img(endShot)}<figcaption>End card</figcaption></figure>` : ""}</div>
<h3>Filmstrip (cada ${stripEvery}s)</h3><div class="strip">${filmstrip}</div></section>

<section id="a"><h2><b>A</b>Secuencia narrativa</h2><p class="lead">Orden de los fragmentos, timestamps del raw y función de cada bloque en el loop problema → tensión → desarrollo → solución → CTA.</p>
<div class="table-wrap"><table><thead><tr><th>#</th><th>Rol</th><th>Raw (in → out)</th><th>Salida</th><th>Dur.</th><th>Función / problema que aborda</th><th>Texto</th></tr></thead><tbody>${secA}</tbody></table></div></section>

<section id="b"><h2><b>B</b>Cortes y encuadres</h2><p class="lead">Corte directo por defecto. Cada corte alterna escala para evitar jump-cuts. Original vs. propuesta renderizada.</p><div class="grid">${secB}</div></section>

<section id="c"><h2><b>C</b>Códigos nativos</h2><p class="lead">Qué código se usa, por qué, qué problema de retención o comprensión resuelve y cómo se mantiene el tono corporativo.</p>
<div class="table-wrap"><table><thead><tr><th>Momento</th><th>Código</th><th>Por qué aquí</th><th>Problema que resuelve</th><th>Aplicación corporativa</th></tr></thead><tbody>${secC}</tbody></table></div></section>

<section id="d"><h2><b>D</b>B-roll</h2><p class="lead">Cada recurso responde a: ¿qué parte del mensaje ayuda a entender, contextualizar o reforzar?</p><div class="grid wide">${secD}</div></section>

<section id="e"><h2><b>E</b>Textos y motion graphics</h2><p class="lead">Jerarquía: 1) subtítulo hablado (serif itálica, blanco) · 2) texto estratégico / dato (serif, dorado en el énfasis) · 3) etiquetas y fuentes (sans, mayúsculas).</p><div class="grid wide">${secE || "<p>Sin motion graphics.</p>"}</div></section>

<section id="f"><h2><b>F</b>Audio y ritmo</h2><p class="lead">Duración de cada plano (ritmo), música, efectos y momentos de énfasis.</p>
<div class="rhythm">${rhythm}</div>
<div class="cols" style="margin-top:16px"><div class="box"><h3>Voz</h3><p>Ganancia ${edit.audio.voiceGainDb} dB · objetivo export −14 LUFS / −1 dBTP.${ana?.sources?.main ? `<br>Raw: ${ana.sources.main.loudness.integratedLufs} LUFS · TP ${ana.sources.main.loudness.truePeakDb} dBFS` : ""}</p></div>
<div class="box"><h3>Música</h3><p>${m ? `${esc(path.basename(m.src))} · vol ${m.volume} (bajo B-roll ${m.duckedVolume}) · fade ${m.fadeInSec}/${m.fadeOutSec}s` : "Sin música (voz sola, como la referencia)."}</p></div>
<div class="box"><h3>Efectos sonoros</h3><ul>${sfx}</ul></div>
<div class="box"><h3>Énfasis</h3><p>${emphasisMoments} momentos de énfasis (punch-ins + textos de énfasis). Palabras resaltadas en subtítulo: ${edit.captions.emphasis.map(esc).join(", ") || "—"}.</p></div></div>
${flags.length ? `<div class="box" style="margin-top:16px"><h3>Alertas del análisis</h3><ul>${flags.map((f) => `<li class="warn">${esc(f)}</li>`).join("")}</ul></div>` : ""}</section>

<section id="ok"><h2>Validación de la dirección creativa</h2><p class="lead">La edición completa no empieza hasta que esta lista esté aprobada.</p>
<ul class="check"><li><label><input type="checkbox">El hook se entiende en el primer segundo y habla al público objetivo.</label></li><li><label><input type="checkbox">El orden de fragmentos sostiene la pregunta abierta hasta el payoff.</label></li><li><label><input type="checkbox">Cada B-roll tiene función narrativa clara y es coherente con el caso.</label></li><li><label><input type="checkbox">Textos y datos verificados (cifras, normas, nombres, ortografía).</label></li><li><label><input type="checkbox">Los acercamientos se sienten naturales; no hay jump-cuts.</label></li><li><label><input type="checkbox">El tono es corporativo, premium y minimalista.</label></li><li><label><input type="checkbox">CTA alineado con la marca.</label></li></ul></section>
</body></html>`;

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  if (inline) fs.rmSync(imgDir, { recursive: true, force: true });
  console.log(`✔ canvas/${slug}/index.html (${(fs.statSync(path.join(outDir, "index.html")).size / 1e6).toFixed(1)} MB)`);
})();
