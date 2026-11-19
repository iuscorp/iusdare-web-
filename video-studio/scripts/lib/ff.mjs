import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {STUDIO_ROOT} from './paths.mjs';

export const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr?.slice(-3000)}`);
  }
  return r;
};

export const ffprobe = (file) => {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
    {encoding: 'utf8'},
  );
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = (v?.avg_frame_rate ?? '0/1').split('/').map(Number);
  const rotation = Number(v?.tags?.rotate ?? v?.side_data_list?.find((x) => x.rotation !== undefined)?.rotation ?? 0);
  return {
    file,
    duration: Number(j.format.duration),
    sizeMB: Math.round(Number(j.format.size) / 1e5) / 10,
    bitrateKbps: Math.round(Number(j.format.bit_rate) / 1000),
    video: v
      ? {codec: v.codec_name, width: v.width, height: v.height, fps: d ? n / d : 0, pixFmt: v.pix_fmt, rotation, colorTransfer: v.color_transfer}
      : null,
    audio: a ? {codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels} : null,
  };
};

/** Integrado/LRA/true peak (EBU R128). */
export const loudness = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary'));
  const num = (re) => Number((s.match(re) || [])[1]);
  return {integratedLufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+([\d.]+) LU/), truePeakDb: num(/Peak:\s+(-?[\d.]+) dBFS/)};
};

export const silences = (file, noiseDb = -35, minDur = 0.25) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=n=${noiseDb}dB:d=${minDur}`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
  const out = [];
  let start = null;
  for (const line of r.stderr.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/);
    const b = line.match(/silence_end: ([\d.]+)/);
    if (a) start = Math.max(0, Number(a[1]));
    if (b && start !== null) {
      out.push({start, end: Number(b[1])});
      start = null;
    }
  }
  return out;
};

export const blackFrames = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', 'blackdetect=d=0:pix_th=0.08', '-an', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
  return [...r.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => ({start: Number(m[1]), end: Number(m[2])}));
};

export const frameAt = (file, t, outPng, {width = 360, filter} = {}) => {
  fs.mkdirSync(path.dirname(outPng), {recursive: true});
  const vf = [filter, `scale=${width}:-2`].filter(Boolean).join(',');
  run('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.max(0, t)), '-i', file, '-frames:v', '1', '-vf', vf, '-q:v', '3', outPng]);
  return outPng;
};

export const python = () => {
  const venv = path.join(STUDIO_ROOT, '.venv', 'bin', 'python');
  return fs.existsSync(venv) ? venv : 'python3';
};
