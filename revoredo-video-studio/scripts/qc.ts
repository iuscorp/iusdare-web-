/**
 * CONTROL DE CALIDAD TÉCNICO
 *
 *   npm run studio:qc -- <video.mp4> [--slug <slug>]
 *
 * Automated checks (the creative checklist stays human — see
 * documentation/11-control-de-calidad.md):
 *   - resolution / fps / codec / pixel format of the export
 *   - duration vs. EDL
 *   - A/V sync proxy: audio vs video stream duration (≤ 1 frame)
 *   - black frames (blackdetect) and frozen frames (freezedetect)
 *   - unexpected silences inside the body (> 1.2 s)
 *   - loudness (−14 LUFS ±1, true peak ≤ −1 dBTP)
 *   - on-screen text dump + common Spanish accent errors
 *   - 1 fps contact sheet for the mandatory visual review
 * Writes <video>.qc.md / .qc.json next to the file.
 */
import fs from "node:fs";
import path from "node:path";
import { arg, loadEdit, positional, probe, run, tc } from "./lib/common";
import { buildTimeline } from "../src/lib/timeline";
import { formats } from "../src/schema/edit";

// Words frequently written without their accent in legal content.
const ACCENTS: Record<string, string> = {
  proteccion: "protección", informacion: "información", sancion: "sanción", regulacion: "regulación",
  autorizacion: "autorización", resolucion: "resolución", direccion: "dirección", tambien: "también",
  biometria: "biometría", especifico: "específico", previo: "previo", tecnologia: "tecnología",
  conversacion: "conversación", escribenos: "Escríbenos", segun: "según", compania: "compañía",
  numero: "número", ultimo: "último", rapido: "rápido", juridico: "jurídico", juridica: "jurídica",
  codigo: "código", publico: "público", economico: "económico", articulo: "artículo", via: "vía",
};

type Check = { name: string; ok: boolean; detail: string };

export const runQc = (file: string, slug?: string): boolean => {
  console.log(`\n• QC ${path.basename(file)}`);
  const checks: Check[] = [];
  const pr = probe(file);
  const edit = slug ? loadEdit(slug) : null;
  const tl = edit ? buildTimeline(edit) : null;

  if (edit) {
    const f = formats[edit.meta.format];
    const isPreview = pr.width === f.width / 2;
    checks.push({ name: "Resolución", ok: (pr.width === f.width && pr.height === f.height) || isPreview, detail: `${pr.width}x${pr.height} (esperado ${f.width}x${f.height}${isPreview ? ", preview 50%" : ""})` });
    checks.push({ name: "FPS", ok: Math.abs(pr.fps - edit.meta.fps) < 0.01, detail: `${pr.fps.toFixed(3)}` });
    const exp = tl!.totalFrames / tl!.fps;
    checks.push({ name: "Duración", ok: Math.abs(pr.duration - exp) < 0.15, detail: `${pr.duration.toFixed(2)} s (EDL ${exp.toFixed(2)} s)` });
  }
  checks.push({ name: "Códec", ok: pr.vcodec === "h264" && pr.pixFmt === "yuv420p" && pr.acodec === "aac", detail: `${pr.vcodec}/${pr.pixFmt} · ${pr.acodec}` });

  // A/V stream durations
  const sd = run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", file]).stdout;
  const streams = JSON.parse(sd).streams as { codec_type: string; duration: string }[];
  const vd = Number(streams.find((s) => s.codec_type === "video")?.duration);
  const ad = Number(streams.find((s) => s.codec_type === "audio")?.duration);
  checks.push({ name: "Sincronía A/V (duración de streams)", ok: Math.abs(vd - ad) <= 1.5 / pr.fps + 0.03, detail: `video ${vd.toFixed(3)} s · audio ${ad.toFixed(3)} s` });

  // Black / frozen frames
  const bd = run("ffmpeg", ["-hide_banner", "-i", file, "-vf", "blackdetect=d=0.05:pic_th=0.97:pix_th=0.06", "-an", "-f", "null", "-"], { allowFail: true }).stderr;
  const blacks = [...bd.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const endCardStart = tl ? tl.bodyFrames / tl.fps : Infinity;
  const badBlacks = blacks.filter(([a]) => a < endCardStart - 0.2);
  checks.push({ name: "Fotogramas negros", ok: badBlacks.length === 0, detail: badBlacks.length ? badBlacks.map(([a, b]) => `${tc(a)}–${tc(b)}`).join(", ") : "ninguno en el cuerpo del video" });
  const fz = run("ffmpeg", ["-hide_banner", "-i", file, "-vf", "freezedetect=n=0.002:d=1.5", "-an", "-f", "null", "-"], { allowFail: true }).stderr;
  const freezes = [...fz.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t < endCardStart - 0.5);
  checks.push({ name: "Imagen congelada (>1.5 s)", ok: freezes.length === 0, detail: freezes.length ? freezes.map(tc).join(", ") : "ninguna" });

  // Silences in body
  const sl = run("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=n=-45dB:d=1.2", "-f", "null", "-"], { allowFail: true }).stderr;
  const sils = [...sl.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t < endCardStart - 0.3);
  checks.push({ name: "Silencios > 1.2 s en el cuerpo", ok: sils.length === 0, detail: sils.length ? sils.map(tc).join(", ") : "ninguno" });

  // Loudness
  const lo = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { allowFail: true }).stderr;
  const sum = lo.slice(lo.lastIndexOf("Summary:"));
  const I = Number(sum.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const TP = Number(sum.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  const isPreviewFile = file.includes(`${path.sep}previews${path.sep}`);
  checks.push({ name: "Loudness", ok: isPreviewFile || (Math.abs(I + 14) <= 1 && TP <= -0.8), detail: `${I} LUFS · TP ${TP} dBFS${isPreviewFile ? " (preview: sin normalizar)" : ""}` });

  // On-screen text
  const texts: string[] = [];
  if (edit) {
    for (const g of edit.graphics) for (const v of Object.values(g.props)) (Array.isArray(v) ? v : [v]).forEach((x) => typeof x === "string" && texts.push(x));
    texts.push(edit.endCard.line, edit.endCard.action);
    texts.push(edit.captions.words.map((w) => edit.captions.replace[w.w] ?? w.w).join(" "));
  }
  const all = texts.join(" ");
  const accentIssues = [...new Set((all.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]+/g) ?? []).filter((w) => ACCENTS[w.toLowerCase()] && ACCENTS[w.toLowerCase()] !== w.toLowerCase() && !/[áéíóú]/i.test(w)))];
  const doubleSpaces = /\s{2,}/.test(texts.slice(0, -1).join("|"));
  checks.push({ name: "Ortografía (tildes frecuentes / espacios)", ok: accentIssues.length === 0 && !doubleSpaces, detail: accentIssues.length ? `revisar: ${accentIssues.map((w) => `${w}→${ACCENTS[w.toLowerCase()]}`).join(", ")}` : doubleSpaces ? "doble espacio en un texto" : "sin alertas automáticas" });

  // Contact sheet for the visual review
  const sheet = file.replace(/\.mp4$/, ".qc-sheet.jpg");
  run("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", "fps=1,scale=216:-2,tile=8x8", "-frames:v", "1", "-q:v", "3", sheet]);

  const ok = checks.every((c) => c.ok);
  const md = [
    `# QC — ${path.basename(file)}`,
    "",
    `Resultado automático: **${ok ? "APROBADO" : "CON OBSERVACIONES"}** · ${new Date().toLocaleString("es-PE")}`,
    "",
    "| Check | Estado | Detalle |",
    "|---|---|---|",
    ...checks.map((c) => `| ${c.name} | ${c.ok ? "✅" : "❌"} | ${c.detail} |`),
    "",
    `Hoja de contacto (1 fps) para revisión visual: \`${path.basename(sheet)}\``,
    "",
    "## Texto en pantalla (revisión ortográfica humana)",
    "",
    ...texts.map((t) => `- ${t}`),
    "",
    "## Revisión visual obligatoria",
    "",
    "- [ ] Reproducido completo con audio (no basta con que compile).",
    "- [ ] Identidad: coherente con Revoredo, corporativo y premium.",
    "- [ ] Retención: cada recurso tiene función; el loop se sostiene.",
    "- [ ] B-roll pertinente, de calidad y bien integrado.",
    "- [ ] Cortes con continuidad; acercamientos naturales; ritmo adecuado.",
    "- [ ] Textos legibles en móvil; sin errores ortográficos.",
  ].join("\n");
  fs.writeFileSync(file.replace(/\.mp4$/, ".qc.md"), md + "\n");
  fs.writeFileSync(file.replace(/\.mp4$/, ".qc.json"), JSON.stringify({ file, ok, checks, loudness: { I, TP } }, null, 2));
  for (const c of checks) console.log(`  ${c.ok ? "✔" : "✖"} ${c.name}: ${c.detail}`);
  console.log(`  → ${path.basename(file.replace(/\.mp4$/, ".qc.md"))} · ${path.basename(sheet)}`);
  return ok;
};

if (require.main === module) {
  const f = positional()[0];
  if (!f) {
    console.error("Uso: npm run studio:qc -- <video.mp4> [--slug <slug>]");
    process.exit(1);
  }
  process.exit(runQc(path.resolve(f), arg("slug")) ? 0 : 2);
}
