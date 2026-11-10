/**
 * B-ROLL MANAGER — búsqueda, registro y asignación.
 *
 *   npm run studio:broll -- needs   <slug>                    # slots pendientes + coincidencias locales + queries
 *   npm run studio:broll -- search  <términos…>               # busca en la biblioteca local (tags/concepto)
 *   npm run studio:broll -- remote  <pexels|pixabay> "<query>" [--orientation portrait] [--n 8]
 *   npm run studio:broll -- add     <archivo|url> --id <id> --concept "…" --tags a,b,c --provider "…" --license "…" [--source-url …]
 *   npm run studio:broll -- assign  <slug> <brollId> <libraryId> [--trim 1.5]
 *   npm run studio:broll -- list
 *
 * Library: b-roll/library.json (metadata) + public/b-roll/library/<id>.<ext> (media).
 * Every asset carries provider + license + concept so it can be reused and audited.
 * Remote search needs PEXELS_API_KEY / PIXABAY_API_KEY in the environment.
 * Other sources (Google Drive, Canva, generación IA) se usan desde los conectores
 * del entorno y luego se registran con `add`. Ver documentation/05-sistema-b-roll.md.
 */
import fs from "node:fs";
import path from "node:path";
import { arg, die, loadEdit, p, probe, projectDir, readJson, run, writeJson } from "./lib/common";

type Asset = {
  id: string;
  file: string;
  kind: "video" | "image";
  concept: string;
  tags: string[];
  provider: string;
  license: string;
  sourceUrl?: string;
  width: number;
  height: number;
  duration: number | null;
  orientation: "portrait" | "landscape" | "square";
  quality: "ok" | "low";
  addedAt: string;
  usedIn: string[];
};

const LIB = p("b-roll", "library.json");
const MEDIA = p("public", "b-roll", "library");
const load = (): Asset[] => (fs.existsSync(LIB) ? readJson<{ assets: Asset[] }>(LIB).assets : []);
const save = (assets: Asset[]) => writeJson(LIB, { _doc: "Biblioteca de B-roll Revoredo. No editar a mano los campos técnicos.", assets });

const [cmd, ...rest] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const score = (a: Asset, terms: string[]) => {
  const hay = norm([a.id, a.concept, ...a.tags].join(" "));
  return terms.reduce((n, t) => n + (hay.includes(norm(t)) ? 1 : 0), 0);
};
const searchLocal = (terms: string[]) =>
  load()
    .map((a) => ({ a, s: score(a, terms) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s);

const showAsset = (a: Asset) =>
  `  ${a.id.padEnd(28)} ${a.kind.padEnd(5)} ${`${a.width}x${a.height}`.padEnd(10)} ${a.duration ? a.duration.toFixed(1) + "s" : "   "}  ${a.quality === "low" ? "⚠ baja " : ""}${a.concept}  [${a.provider}]`;

const remote = async (provider: string, query: string) => {
  const orientation = arg("orientation", "portrait")!;
  const n = Number(arg("n", "8"));
  if (provider === "pexels") {
    const key = process.env.PEXELS_API_KEY ?? die("Falta PEXELS_API_KEY (ver documentation/05-sistema-b-roll.md).");
    const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${n}`, {
      headers: { Authorization: key! },
    });
    if (!r.ok) die(`Pexels ${r.status}: ${await r.text()}`);
    const j = (await r.json()) as { videos: { id: number; url: string; duration: number; width: number; height: number; video_files: { link: string; width: number; height: number; quality: string }[] }[] };
    for (const v of j.videos) {
      const best = [...v.video_files].filter((f) => f.width).sort((a, b) => b.width * b.height - a.width * a.height)[0];
      console.log(`• pexels-${v.id}  ${v.width}x${v.height}  ${v.duration}s  ${v.url}\n    descarga: ${best?.link}`);
    }
    console.log("\nLicencia Pexels: uso libre, sin atribución obligatoria (verificar personas/marcas visibles).");
  } else if (provider === "pixabay") {
    const key = process.env.PIXABAY_API_KEY ?? die("Falta PIXABAY_API_KEY.");
    const r = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=${Math.max(3, n)}`);
    if (!r.ok) die(`Pixabay ${r.status}`);
    const j = (await r.json()) as { hits: { id: number; pageURL: string; duration: number; videos: Record<string, { url: string; width: number; height: number }> }[] };
    for (const h of j.hits) {
      const v = h.videos.large?.url ? h.videos.large : h.videos.medium;
      console.log(`• pixabay-${h.id}  ${v.width}x${v.height}  ${h.duration}s  ${h.pageURL}\n    descarga: ${v.url}`);
    }
    console.log("\nLicencia Pixabay Content License: uso comercial permitido, sin atribución obligatoria.");
  } else die(`Proveedor desconocido: ${provider}`);
};

const add = async (input: string) => {
  const id = arg("id") ?? die("--id requerido");
  if (load().some((a) => a.id === id)) die(`Ya existe el asset ${id}`);
  fs.mkdirSync(MEDIA, { recursive: true });
  let ext = path.extname(input.split("?")[0]).toLowerCase() || ".mp4";
  const dest = path.join(MEDIA, `${id}${ext}`);
  if (/^https?:\/\//.test(input)) {
    const r = await fetch(input);
    if (!r.ok) die(`Descarga falló (${r.status})`);
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  } else {
    if (!fs.existsSync(input)) die(`No existe ${input}`);
    fs.copyFileSync(input, dest);
  }
  const kind: Asset["kind"] = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? "image" : "video";
  // Normalize video b-roll to H.264 / yuv420p / no audio for reliable rendering.
  let finalDest = dest;
  if (kind === "video") {
    const tmp = path.join(MEDIA, `${id}.norm.mp4`);
    run("ffmpeg", ["-v", "error", "-y", "-i", dest, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp]);
    if (dest !== tmp) fs.rmSync(dest);
    ext = ".mp4";
    finalDest = path.join(MEDIA, `${id}.mp4`);
    fs.renameSync(tmp, finalDest);
  }
  const pr = kind === "video" ? probe(finalDest) : (() => {
    const o = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", finalDest]).stdout.trim().split(",").map(Number);
    return { width: o[0], height: o[1], duration: 0 };
  })();
  const orientation = pr.height > pr.width * 1.05 ? "portrait" : pr.width > pr.height * 1.05 ? "landscape" : "square";
  // Full-screen vertical needs ≥1080 on the short side after crop.
  const quality: Asset["quality"] = Math.min(pr.width, pr.height) >= 1080 ? "ok" : "low";
  const asset: Asset = {
    id,
    file: `b-roll/library/${id}${ext}`,
    kind,
    concept: arg("concept", "")!,
    tags: (arg("tags", "") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    provider: arg("provider", "desconocido")!,
    license: arg("license", "")!,
    sourceUrl: arg("source-url") ?? (/^https?:/.test(input) ? input : undefined),
    width: pr.width,
    height: pr.height,
    duration: kind === "video" ? pr.duration : null,
    orientation,
    quality,
    addedAt: new Date().toISOString(),
    usedIn: [],
  };
  if (!asset.license) console.warn("⚠ Sin licencia registrada: no usar en un export final hasta completarla.");
  if (quality === "low") console.warn("⚠ Resolución < 1080 en el lado corto: usar solo en layout 'card' o 'split-top'.");
  save([...load(), asset]);
  console.log(`✔ Registrado:\n${showAsset(asset)}\n  → public/${asset.file}`);
};

const needs = (slug: string) => {
  const edit = loadEdit(slug);
  const pending = edit.broll.filter((b) => !b.src);
  console.log(`\nB-roll de ${slug}: ${edit.broll.length} slots, ${pending.length} pendientes\n`);
  for (const b of edit.broll) {
    console.log(`${b.src ? "✔" : "○"} ${b.id}  [${b.start.toFixed(2)}–${b.end.toFixed(2)} s ${b.clock}]  “${b.phrase}”`);
    console.log(`    concepto: ${b.concept}\n    función:  ${b.function}\n    necesita: ${b.description}`);
    if (!b.src) {
      const terms = [...b.concept.split(/[\s/,]+/), ...b.searchQuery.split(/\s+/)].filter((t) => t.length > 3);
      const local = searchLocal(terms).slice(0, 3);
      console.log(`    biblioteca: ${local.length ? local.map((x) => x.a.id).join(", ") : "sin coincidencias"}`);
      console.log(`    buscar:     npm run studio:broll -- remote pexels "${b.searchQuery || b.concept}"`);
    } else console.log(`    archivo:  public/${b.src}  (${b.provider}${b.license ? " · " + b.license : ""})`);
    console.log("");
  }
};

const assign = (slug: string, brollId: string, assetId: string) => {
  const assets = load();
  const a = assets.find((x) => x.id === assetId) ?? die(`No existe el asset ${assetId}`);
  const f = path.join(projectDir(slug), "edit.json");
  const raw = readJson<{ broll: Record<string, unknown>[] }>(f);
  const slot = raw.broll.find((b) => b.id === brollId) ?? die(`No existe el slot ${brollId}`);
  Object.assign(slot, { src: a!.file, kind: a!.kind, provider: a!.provider, license: a!.license, trimStart: Number(arg("trim", String(slot.trimStart ?? 0))) });
  if (a!.quality === "low" && (slot.layout ?? "full") === "full") console.warn("⚠ Asset de baja resolución en layout full: considerar 'card'.");
  writeJson(f, raw);
  a!.usedIn = Array.from(new Set([...a!.usedIn, slug]));
  save(assets);
  console.log(`✔ ${slug} · ${brollId} ← ${assetId}`);
};

(async () => {
  switch (cmd) {
    case "list":
      load().forEach((a) => console.log(showAsset(a)));
      break;
    case "search": {
      const r = searchLocal(rest);
      if (!r.length) console.log("Sin coincidencias locales. Probar: npm run studio:broll -- remote pexels \"…\"");
      r.forEach((x) => console.log(showAsset(x.a)));
      break;
    }
    case "remote":
      await remote(rest[0], rest.slice(1).join(" "));
      break;
    case "add":
      await add(rest[0] ?? die("Falta archivo o URL"));
      break;
    case "needs":
      needs(rest[0] ?? die("Falta slug"));
      break;
    case "assign":
      assign(rest[0], rest[1], rest[2]);
      break;
    default:
      console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]);
  }
})();
