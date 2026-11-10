import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { editSchema, type Edit } from "../../src/schema/edit";

export const ROOT = path.resolve(__dirname, "..", "..");
export const PUBLIC = path.join(ROOT, "public");
export const p = (...parts: string[]) => path.join(ROOT, ...parts);

export const projectDir = (slug: string) => p("projects", slug);

export const die = (msg: string): never => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

export const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
export const flag = (name: string) => process.argv.includes(`--${name}`);
export const positional = () => process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));

export const run = (cmd: string, args: string[], opts: { quiet?: boolean; allowFail?: boolean } = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 200 });
  if (r.status !== 0 && !opts.allowFail) {
    die(`${cmd} ${args.join(" ")}\n${r.stderr?.slice(-2000)}`);
  }
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status ?? 1 };
};

export const readJson = <T = unknown>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8")) as T;
export const writeJson = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
};

export const loadEdit = (slug: string): Edit => {
  const f = path.join(projectDir(slug), "edit.json");
  if (!fs.existsSync(f)) die(`No existe ${path.relative(ROOT, f)}. Crea el proyecto con: npm run studio:new -- ${slug}`);
  const parsed = editSchema.safeParse(readJson(f));
  if (!parsed.success) {
    return die(`edit.json inválido:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  return parsed.data;
};

/** Absolute path of a public/ media reference used in edit.json. */
export const mediaPath = (rel: string) => path.join(PUBLIC, rel);

export type Probe = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  vcodec: string;
  acodec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number;
  rotation: number;
  pixFmt: string;
};

export const probe = (file: string): Probe => {
  const { stdout } = run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const a = j.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const [n, d] = String(v?.r_frame_rate ?? "30/1").split("/").map(Number);
  const rot = Number(v?.side_data_list?.find((x: { rotation?: number }) => x.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0);
  return {
    duration: Number(j.format.duration),
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    fps: d ? n / d : n,
    vcodec: v?.codec_name ?? "none",
    acodec: a?.codec_name ?? null,
    sampleRate: a ? Number(a.sample_rate) : null,
    channels: a?.channels ?? null,
    bitrate: Number(j.format.bit_rate ?? 0),
    rotation: rot,
    pixFmt: v?.pix_fmt ?? "",
  };
};

export const browserExecutable = () => {
  const c = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
  ].filter(Boolean) as string[];
  return c.find((x) => fs.existsSync(x)) ?? null;
};

let bundled: string | null = null;
export const getBundle = async () => {
  if (bundled) return bundled;
  const { bundle } = await import("@remotion/bundler");
  process.stdout.write("• Empaquetando proyecto Remotion… ");
  bundled = await bundle({ entryPoint: p("src", "index.ts"), publicDir: PUBLIC });
  console.log("ok");
  return bundled;
};

export const extractFrame = (src: string, t: number, out: string, width = 540) => {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  run("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(3), "-i", src, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "3", out]);
};

export const tc = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
};
