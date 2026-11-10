/**
 * npm run studio:new -- <slug> [--source path/al/raw.mp4] [--title "Título"]
 *
 * Creates:
 *   projects/<slug>/edit.json        EDL (from the template, empty segments to fill)
 *   projects/<slug>/brief.md         brief (copied from briefs/_plantilla-brief.md)
 *   public/footage/raw/<slug>/       raw footage folder (source copied in if given)
 */
import fs from "node:fs";
import path from "node:path";
import { arg, die, p, positional, projectDir, writeJson } from "./lib/common";

const slug = positional()[0] ?? die("Uso: npm run studio:new -- <slug> [--source archivo.mp4] [--title \"…\"]");
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) die("El slug debe ser kebab-case: p. ej. 2026-11-caso-gimnasio-biometria");
const dir = projectDir(slug);
if (fs.existsSync(path.join(dir, "edit.json"))) die(`El proyecto ${slug} ya existe.`);

const rawDir = p("public", "footage", "raw", slug);
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(path.join(dir, "analysis"), { recursive: true });

let sourceRel = `footage/raw/${slug}/main.mp4`;
const source = arg("source");
if (source) {
  if (!fs.existsSync(source)) die(`No existe ${source}`);
  const ext = path.extname(source).toLowerCase() || ".mp4";
  sourceRel = `footage/raw/${slug}/main${ext}`;
  fs.copyFileSync(source, p("public", sourceRel));
  console.log(`• Raw copiado a public/${sourceRel}`);
}

writeJson(path.join(dir, "edit.json"), {
  meta: { slug, title: arg("title", slug), format: "vertical", fps: 30, status: "analisis" },
  sources: { main: sourceRel },
  story: { problem: "", whyItMatters: "", riskOrOpportunity: "", openQuestion: "", payoff: "", cta: "Tenemos una conversación pendiente" },
  segments: [
    { id: "S01", in: 0, out: 3, role: "hook", purpose: "", framing: { preset: "close" }, nativeCodes: ["hook"], rationale: "" },
  ],
  graphics: [],
  broll: [],
  captions: { enabled: true, wordsPerGroup: 3, emphasis: [], words: [], replace: {} },
  audio: { voiceGainDb: 0, music: null, sfx: [] },
  endCard: { enabled: true, durationSec: 2.2, line: "Tenemos una conversación pendiente", action: "Escríbenos" },
  showLogo: true,
});

const briefTpl = p("briefs", "_plantilla-brief.md");
if (fs.existsSync(briefTpl)) {
  fs.writeFileSync(path.join(dir, "brief.md"), fs.readFileSync(briefTpl, "utf8").replace(/\{\{slug\}\}/g, slug));
}

console.log(`
✔ Proyecto creado: projects/${slug}

Siguientes pasos:
  1. Coloca el raw en public/${sourceRel}${source ? " (hecho)" : ""}
  2. Completa projects/${slug}/brief.md
  3. npm run studio:analyze -- ${slug}
`);
