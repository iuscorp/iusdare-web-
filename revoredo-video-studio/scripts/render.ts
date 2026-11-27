/**
 * SISTEMA DE RENDERIZADO
 *
 *   npm run studio:render -- <slug> --preview [--hud]   → previews/<slug>/<slug>-preview-vN.mp4 (540p, rápido)
 *   npm run studio:render -- <slug>                     → exports/<slug>/<slug>-final-vN.mp4 (1080p) + loudnorm + QC
 *   npm run studio:render -- <slug> --frames 0-90       → render parcial para revisar un tramo
 *
 * Guardrail: the final render requires the canvas (canvas/<slug>/index.html)
 * and edit.meta.status ∈ {aprobado, edicion, revision, final}. --force overrides.
 */
import fs from "node:fs";
import path from "node:path";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { arg, browserExecutable, die, flag, getBundle, loadEdit, p, positional, run } from "./lib/common";
import { runQc } from "./qc";

const slug = positional()[0] ?? die("Uso: npm run studio:render -- <slug> [--preview]");
const edit = loadEdit(slug);
const preview = flag("preview");

if (!preview && !flag("force")) {
  if (!fs.existsSync(p("canvas", slug, "index.html"))) die(`Falta el canvas de preview. Ejecuta primero: npm run studio:canvas -- ${slug}`);
  if (!["aprobado", "edicion", "revision", "final"].includes(edit.meta.status))
    die(`La dirección creativa no está aprobada (meta.status = "${edit.meta.status}"). Cambia a "aprobado" tras validar el canvas, o usa --force.`);
}

const outDir = p(preview ? "previews" : "exports", slug);
fs.mkdirSync(outDir, { recursive: true });
const kind = preview ? "preview" : "final";
const existing = fs.readdirSync(outDir).filter((f) => f.startsWith(`${slug}-${kind}-v`) && f.endsWith(".mp4"));
const v = existing.length + 1;
const out = path.join(outDir, `${slug}-${kind}-v${v}.mp4`);
const raw = preview ? out : out.replace(/\.mp4$/, ".raw.mp4");

(async () => {
  const serveUrl = await getBundle();
  const exe = browserExecutable();
  const inputProps = { edit, hud: flag("hud") };
  const composition = await selectComposition({ serveUrl, id: "RevoredoReel", inputProps, browserExecutable: exe });
  const fr = arg("frames");
  const frameRange = fr ? (fr.split("-").map(Number) as [number, number]) : null;
  console.log(`• Render ${kind}: ${composition.width}x${composition.height} @${composition.fps} · ${(composition.durationInFrames / composition.fps).toFixed(1)} s`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: raw,
    inputProps,
    browserExecutable: exe,
    scale: preview ? 0.5 : 1,
    crf: preview ? 26 : 16,
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    audioBitrate: "320k",
    frameRange,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct !== last && pct % 5 === 0) process.stdout.write(`\r  ${pct}%`);
      last = pct;
    },
  });
  console.log("");

  if (!preview) {
    // Loudness normalization to platform target: −14 LUFS, −1 dBTP (two-pass).
    console.log("• Normalizando audio a −14 LUFS / −1 dBTP");
    const m = run("ffmpeg", ["-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"]).stderr;
    const j = JSON.parse(m.slice(m.lastIndexOf("{"), m.lastIndexOf("}") + 1));
    run("ffmpeg", [
      "-v", "error", "-y", "-i", raw, "-c:v", "copy",
      "-af", `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`,
      "-ar", "48000", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", out,
    ]);
    fs.rmSync(raw);
  }
  console.log(`✔ ${path.relative(p(), out)}`);
  if (!preview || flag("qc")) {
    const ok = runQc(out, slug);
    if (!ok) process.exitCode = 2;
  }
})();
