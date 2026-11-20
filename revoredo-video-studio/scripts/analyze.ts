/**
 * PASO 1 — ANALIZAR EL MATERIAL
 *
 * npm run studio:analyze -- <slug> [--no-transcribe] [--model small|medium] [--apply-captions]
 *
 * For every source in edit.json:
 *   - technical probe (resolution, fps, codecs, rotation, bitrate)
 *   - loudness (EBU R128: integrated LUFS, true peak, LRA)
 *   - pauses (silencedetect)  → cut candidates
 *   - visual changes (scene detection)
 *   - 1 fps frames + contact sheet, exposure & sharpness per second
 *   - word-level transcript (faster-whisper + brand glossary)
 *   - speech metrics: words/min, fillers, repeated phrases (= probable retakes)
 * Writes projects/<slug>/analysis/{analysis.json, analysis.md, transcript-<src>.json, frames/}
 */
import fs from "node:fs";
import path from "node:path";
import { arg, die, flag, loadEdit, mediaPath, p, positional, probe, projectDir, readJson, run, tc, writeJson } from "./lib/common";

type Word = { w: string; s: number; e: number; p?: number };

const slug = positional()[0] ?? die("Uso: npm run studio:analyze -- <slug>");
const edit = loadEdit(slug);
const outDir = path.join(projectDir(slug), "analysis");
fs.mkdirSync(outDir, { recursive: true });

const FILLERS = ["eh", "ehh", "em", "mmm", "este", "o sea", "digamos", "bueno", "¿no?", "pues", "entonces"];

const loudness = (file: string) => {
  const { stderr } = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { allowFail: true });
  const tail = stderr.slice(stderr.lastIndexOf("Summary:"));
  const num = (re: RegExp) => Number(tail.match(re)?.[1] ?? NaN);
  return { integratedLufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+([\d.]+) LU/), truePeakDb: num(/Peak:\s+(-?[\d.]+) dBFS/) };
};

const silences = (file: string, noise = -35, d = 0.3) => {
  const { stderr } = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `silencedetect=n=${noise}dB:d=${d}`, "-f", "null", "-"], { allowFail: true });
  const out: { start: number; end: number; dur: number }[] = [];
  let s: number | null = null;
  for (const line of stderr.split("\n")) {
    const a = line.match(/silence_start: (-?[\d.]+)/);
    const b = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
    if (a) s = Math.max(0, Number(a[1]));
    if (b && s !== null) {
      out.push({ start: s, end: Number(b[1]), dur: Number(b[2]) });
      s = null;
    }
  }
  return out;
};

const scenes = (file: string, threshold = 0.3) => {
  const { stderr } = run("ffmpeg", ["-hide_banner", "-i", file, "-vf", `select='gt(scene,${threshold})',showinfo`, "-f", "null", "-"], { allowFail: true });
  const ts = [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
  // collapse bursts (flashes / fast motion) into one change
  return ts.filter((t, i) => i === 0 || t - ts[i - 1] > 0.5);
};

const frames = (file: string, id: string) => {
  const dir = path.join(outDir, "frames", id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  run("ffmpeg", ["-v", "error", "-i", file, "-vf", "fps=1,scale=270:-2", "-q:v", "4", path.join(dir, "s%04d.jpg")]);
  run("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", "fps=1,scale=160:-2,tile=10x8", "-frames:v", "1", path.join(outDir, `contact-${id}.jpg`)]);
  // exposure (mean luma) + sharpness (variance of Laplacian) per second
  const py = `
import sys,glob,json
import numpy as np
from PIL import Image
out=[]
for i,f in enumerate(sorted(glob.glob(sys.argv[1]+'/*.jpg'))):
    a=np.asarray(Image.open(f).convert('L'),dtype=np.float32)
    lap=(a[1:-1,1:-1]*-4+a[:-2,1:-1]+a[2:,1:-1]+a[1:-1,:-2]+a[1:-1,2:])
    out.append({'t':i,'luma':round(float(a.mean()),1),'sharp':round(float(lap.var()),1)})
print(json.dumps(out))`;
  const r = run("python3", ["-I", "-c", py, dir], { allowFail: true });
  try {
    return JSON.parse(r.stdout) as { t: number; luma: number; sharp: number }[];
  } catch {
    return [];
  }
};

const speechMetrics = (words: Word[]) => {
  if (!words.length) return null;
  const dur = words[words.length - 1].e - words[0].s;
  const text = words.map((w) => w.w.toLowerCase().replace(/[.,;:!?¿¡"]/g, ""));
  const fillers = words.filter((w, i) => FILLERS.includes(text[i])).map((w) => ({ t: w.s, w: w.w }));
  // repeated 3-grams within 12 s → probable retake / false start
  const repeats: { phrase: string; first: number; again: number }[] = [];
  for (let i = 0; i + 2 < text.length; i++) {
    const g = `${text[i]} ${text[i + 1]} ${text[i + 2]}`;
    for (let j = i + 3; j + 2 < text.length && words[j].s - words[i].s < 12; j++) {
      if (`${text[j]} ${text[j + 1]} ${text[j + 2]}` === g) {
        repeats.push({ phrase: g, first: words[i].s, again: words[j].s });
        break;
      }
    }
  }
  const gaps = words
    .slice(1)
    .map((w, i) => ({ at: words[i].e, gap: w.s - words[i].e }))
    .filter((g) => g.gap > 0.45);
  const lowConfidence = words.filter((w) => (w.p ?? 1) < 0.55).map((w) => ({ t: w.s, w: w.w, p: w.p }));
  return { wordsPerMinute: Math.round((words.length / dur) * 60), fillers, repeats, gaps, lowConfidence };
};

const report: Record<string, unknown> = { slug, generatedAt: new Date().toISOString(), sources: {} };
const md: string[] = [`# Análisis — ${edit.meta.title}`, "", `Proyecto: \`${slug}\` · generado ${new Date().toLocaleString("es-PE")}`, ""];

for (const [id, rel] of Object.entries(edit.sources)) {
  const file = mediaPath(rel);
  if (!fs.existsSync(file)) die(`Falta el raw de "${id}": public/${rel}`);
  console.log(`\n▶ ${id}: public/${rel}`);
  const tech = probe(file);
  console.log(`  ${tech.width}x${tech.height} @ ${tech.fps.toFixed(2)} fps · ${tech.duration.toFixed(2)} s · ${tech.vcodec}/${tech.acodec}`);
  const loud = loudness(file);
  console.log(`  Loudness: ${loud.integratedLufs} LUFS · TP ${loud.truePeakDb} dBFS · LRA ${loud.lra}`);
  const sil = silences(file);
  const sc = scenes(file);
  console.log(`  Pausas ≥0.3 s: ${sil.length} · cambios visuales: ${sc.length}`);
  const fr = frames(file, id);

  let transcript: { words: Word[]; segments: { start: number; end: number; text: string }[] } | null = null;
  const tFile = path.join(outDir, `transcript-${id}.json`);
  if (!flag("no-transcribe")) {
    if (tech.acodec) {
      console.log("  Transcribiendo (faster-whisper)…");
      const r = run("python3", ["-I", p("scripts", "transcribe.py"), file, tFile, "--model", arg("model", "small")!, "--glossary", p("brand", "glossary.json")], { allowFail: true });
      if (r.status !== 0) console.warn("  ⚠ Transcripción falló (¿pip install faster-whisper?):\n" + r.stderr.slice(-800));
    }
  }
  if (fs.existsSync(tFile)) transcript = readJson(tFile);
  const speech = transcript ? speechMetrics(transcript.words) : null;

  // Quality flags
  const flags: string[] = [];
  const outW = 1080;
  if (tech.width < outW) flags.push(`Resolución ${tech.width}px < ${outW}px de salida: limitar punch-in a ≤1.20 y evitar 'extreme'.`);
  if (tech.rotation) flags.push(`Metadato de rotación ${tech.rotation}°: verificar orientación en el render.`);
  if (loud.integratedLufs < -24) flags.push(`Audio bajo (${loud.integratedLufs} LUFS): subir voiceGainDb y normalizar en export.`);
  if (loud.truePeakDb > -1) flags.push(`True peak ${loud.truePeakDb} dBFS: riesgo de clipping.`);
  const dark = fr.filter((f) => f.luma < 55).map((f) => f.t);
  if (dark.length) flags.push(`Segundos subexpuestos: ${dark.slice(0, 12).join(", ")}${dark.length > 12 ? "…" : ""}`);
  const sharpMed = fr.length ? [...fr].sort((a, b) => a.sharp - b.sharp)[Math.floor(fr.length / 2)].sharp : 0;
  const soft = fr.filter((f) => f.sharp < sharpMed * 0.45).map((f) => f.t);
  if (soft.length) flags.push(`Segundos con pérdida de nitidez (movimiento/foco): ${soft.slice(0, 12).join(", ")}`);
  if (speech && speech.repeats.length) flags.push(`${speech.repeats.length} frases repetidas → posibles tomas falsas a eliminar.`);

  (report.sources as Record<string, unknown>)[id] = { file: rel, tech, loudness: loud, silences: sil, scenes: sc, frames: fr, speech, flags };

  md.push(`## Fuente \`${id}\``, "", `- Archivo: \`public/${rel}\``, `- Técnica: ${tech.width}×${tech.height}, ${tech.fps.toFixed(2)} fps, ${tech.duration.toFixed(2)} s, ${tech.vcodec} / ${tech.acodec ?? "sin audio"} ${tech.sampleRate ? `${tech.sampleRate} Hz ${tech.channels}ch` : ""}, ${(tech.bitrate / 1e6).toFixed(1)} Mb/s`);
  md.push(`- Audio: ${loud.integratedLufs} LUFS integrados · true peak ${loud.truePeakDb} dBFS · LRA ${loud.lra} LU (objetivo export: −14 LUFS / −1 dBTP)`);
  md.push(`- Pausas ≥ 0.3 s: ${sil.length}${sil.length ? " → " + sil.slice(0, 15).map((s) => `${tc(s.start)} (${s.dur.toFixed(2)} s)`).join(", ") : ""}`);
  md.push(`- Cambios visuales detectados: ${sc.length ? sc.map(tc).join(", ") : "ninguno (toma única)"}`);
  md.push(`- Hoja de contacto: \`analysis/contact-${id}.jpg\``, "");
  if (speech) {
    md.push(`### Habla`, "", `- Ritmo: ${speech.wordsPerMinute} palabras/min (referencia Revoredo ≈ 175–190)`);
    md.push(`- Muletillas: ${speech.fillers.length ? speech.fillers.map((f) => `${f.w} @${tc(f.t)}`).join(", ") : "ninguna"}`);
    md.push(`- Repeticiones (posibles retomas): ${speech.repeats.length ? speech.repeats.map((r) => `“${r.phrase}” ${tc(r.first)} → ${tc(r.again)}`).join("; ") : "ninguna"}`);
    md.push(`- Huecos > 0.45 s entre palabras: ${speech.gaps.length ? speech.gaps.map((g) => `${tc(g.at)} (${g.gap.toFixed(2)} s)`).join(", ") : "ninguno"}`);
    md.push(`- Palabras de baja confianza (revisar ortografía): ${speech.lowConfidence.length ? speech.lowConfidence.map((w) => `${w.w} @${tc(w.t)}`).join(", ") : "ninguna"}`, "");
    md.push(`### Transcripción`, "");
    for (const s of transcript!.segments) md.push(`- \`${tc(s.start)}–${tc(s.end)}\` ${s.text}`);
    md.push("");
  }
  md.push(`### Alertas`, "", ...(flags.length ? flags.map((f) => `- ⚠ ${f}`) : ["- Sin alertas técnicas."]), "");

  if (flag("apply-captions") && transcript && id === edit.captions.source) {
    const ef = path.join(projectDir(slug), "edit.json");
    const raw = readJson<Record<string, unknown> & { captions?: Record<string, unknown> }>(ef);
    raw.captions = { ...(raw.captions ?? {}), words: transcript.words.map(({ w, s, e }) => ({ w, s, e })) };
    writeJson(ef, raw);
    console.log(`  ✔ ${transcript.words.length} palabras volcadas a edit.json → captions.words`);
  }
}

md.push(
  "## Próximo paso",
  "",
  "PASO 2 — completar `story` en edit.json (problema, por qué importa, riesgo, pregunta abierta, payoff, CTA) y definir `segments`.",
  "Ver documentation/10-flujo-de-produccion.md.",
);

writeJson(path.join(outDir, "analysis.json"), report);
fs.writeFileSync(path.join(outDir, "analysis.md"), md.join("\n") + "\n");
console.log(`\n✔ projects/${slug}/analysis/analysis.md`);
