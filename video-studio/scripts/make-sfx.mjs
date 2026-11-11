#!/usr/bin/env node
/**
 * Genera la librería de efectos sonoros del estudio por síntesis (FFmpeg lavfi).
 * Sin samples de terceros → sin problemas de licencia. Reemplazables por SFX propios
 * con el mismo nombre en public/sfx/.
 *   pop    – aparición de sticker/tarjeta
 *   whoosh – crash zoom / cambio de escala fuerte
 *   swish  – entrada lateral de texto
 *   type   – tecleo de tarjeta de norma
 *   click  – cursor / selección
 *   ding   – revelación / dato clave
 *   boom   – golpe grave para el veredicto
 *   poi    – boing cómico ascendente      kiran – destello/campanitas
 *   riser  – subida de tensión            fahhh – exclamación (aprox.)
 *   stamp  – golpe de sello de impacto
 */
import path from 'node:path';
import fs from 'node:fs';
import {run} from './lib/ff.mjs';
import {PUBLIC_DIR} from './lib/paths.mjs';

const out = path.join(PUBLIC_DIR, 'sfx');
fs.mkdirSync(out, {recursive: true});

const defs = {
  // v2 (más gancho): capas, transitorios marcados y colas; todas normalizadas a −3 dBFS.
  // pop: burbuja con cuerpo (barrido descendente + golpe grave corto)
  pop: "aevalsrc='(0.9*sin(2*PI*(1500*t-5000*t*t))*exp(-26*t)+0.6*sin(2*PI*180*t)*exp(-45*t))*(1-exp(-3000*t))':d=0.14:s=48000",
  // snap: tic seco para cada corte de plano (marca el ritmo)
  snap: "aevalsrc='((2*random(0)-1)*exp(-140*t)+0.7*sin(2*PI*3400*t)*exp(-110*t))':d=0.06:s=48000,highpass=f=600",
  // whoosh: barrido de aire con tono ascendente y flanger (zooms, entradas grandes)
  whoosh:
    "anoisesrc=d=0.5:c=pink:a=1[n];[n]bandpass=f=1800:width_type=o:w=2.2,afade=t=in:d=0.3:curve=qsin,afade=t=out:st=0.3:d=0.2:curve=qsin,flanger=delay=2:depth=8:speed=3[w];aevalsrc='0.3*sin(2*PI*(220*t+1300*t*t))*sin(PI*t/0.5)':d=0.5:s=48000[s];[w][s]amix=inputs=2:normalize=0",
  // swish: entrada lateral rápida
  swish: "anoisesrc=d=0.24:c=white:a=0.9[n];[n]bandpass=f=4200:width_type=o:w=1.6,afade=t=in:d=0.1:curve=qsin,afade=t=out:st=0.1:d=0.14,flanger=delay=1:depth=5:speed=6",
  // type: ráfaga de teclas (normas en pantalla)
  type: "aevalsrc='(2*random(0)-1)*exp(-260*mod(t,0.065))*lt(t,0.42)':d=0.45:s=48000,highpass=f=1800,lowpass=f=9000",
  click: "aevalsrc='(0.9*sin(2*PI*2600*t)*exp(-160*t)+(2*random(0)-1)*0.4*exp(-300*t))':d=0.04:s=48000",
  // ding: campana brillante (parciales inarmónicos)
  ding: "aevalsrc='0.5*(sin(2*PI*1320*t)*exp(-4*t)+0.6*sin(2*PI*2640*t)*exp(-6*t)+0.4*sin(2*PI*3950*t)*exp(-9*t))*(1-exp(-800*t))':d=1.0:s=48000",
  // poi: boing cómico ascendente (negaciones)
  poi: "aevalsrc='0.9*sin(2*PI*(300*t+3200*t*t))*exp(-11*t)*(1-exp(-600*t))*(1+0.25*sin(2*PI*28*t))':d=0.26:s=48000",
  // kiran: destello de campanitas ascendentes + brillo
  kiran: "aevalsrc='0.4*(sin(2*PI*2093*t)*exp(-7*t)+sin(2*PI*2637*(t-0.05))*exp(-7*(t-0.05))*gt(t,0.05)+sin(2*PI*3136*(t-0.1))*exp(-6*(t-0.1))*gt(t,0.1)+sin(2*PI*4186*(t-0.15))*exp(-5*(t-0.15))*gt(t,0.15))':d=1.0:s=48000[a];anoisesrc=d=1.0:c=white:a=0.12[n];[n]highpass=f=7000,afade=t=out:st=0:d=1.0[s];[a][s]amix=inputs=2:normalize=0,aecho=0.7:0.5:90:0.25",
  // riser: tensión 1.6 s (tono ascendente con trémolo que acelera + aire) y corte seco
  riser: "aevalsrc='0.5*sin(2*PI*(140*t+240*t*t))*(t/1.6)^1.4*(0.65+0.35*sin(2*PI*(4*t+7*t*t)))':d=1.6:s=48000[a];anoisesrc=d=1.6:c=white:a=0.7[n];[n]highpass=f=1500,afade=t=in:d=1.6:curve=exp[w];[a][w]amix=inputs=2:normalize=0",
  // fahhh: soplo vocal con caída (aprox.; importar el original con sfx:import)
  fahhh: "anoisesrc=d=1.1:c=pink:a=0.9[n];[n]bandpass=f=1100:width_type=h:w=900,afade=t=in:d=0.04,afade=t=out:st=0.25:d=0.85[f];aevalsrc='0.3*sin(2*PI*(230-70*t)*t)*exp(-2*t)':d=1.1:s=48000[v];[f][v]amix=inputs=2:normalize=0,aecho=0.6:0.5:60:0.3",
  // stamp: sello = golpe grave + chasquido + cola corta
  stamp: "aevalsrc='0.95*sin(2*PI*(95*t-60*t*t))*exp(-9*t)':d=0.5:s=48000[a];anoisesrc=d=0.06:c=white:a=1[n];[n]highpass=f=1200,afade=t=out:st=0:d=0.06[c];[a][c]amix=inputs=2:duration=longest:normalize=0,aecho=0.7:0.4:70:0.25",
  // hit: impacto cinematográfico (sub con caída + ráfaga + reverberación)
  hit: "aevalsrc='0.95*sin(2*PI*(90*t-30*t*t))*exp(-3.5*t)*(1-exp(-500*t))':d=1.3:s=48000[s];anoisesrc=d=0.3:c=brown:a=1[n];[n]lowpass=f=1400,afade=t=out:st=0:d=0.3[b];[s][b]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.6:110|230:0.35|0.2",
  // drop: sub-bajo tipo 808 (giros, ruptura de patrón)
  drop: "aevalsrc='0.95*sin(2*PI*(100*t-30*t*t))*exp(-2.4*t)*(1-exp(-300*t))':d=1.3:s=48000",
  boom: "aevalsrc='0.95*sin(2*PI*(70*t-20*t*t))*exp(-4*t)':d=0.9:s=48000[a];anoisesrc=d=0.1:c=brown:a=0.9[n];[a][n]amix=inputs=2:duration=longest:normalize=0,lowpass=f=300",
  // scratch: rayado de vinilo (objeción / «¿y si…?»)
  scratch: "aevalsrc='0.8*sin(2*PI*(700*t+260*sin(2*PI*7*t)))*abs(sin(2*PI*7*t))+0.35*(2*random(0)-1)*abs(sin(2*PI*7*t))':d=0.36:s=48000,bandpass=f=1500:width_type=o:w=2.5",
  // shutter: obturador de cámara (aparece una foto)
  shutter: "aevalsrc='(2*random(0)-1)*(exp(-180*t)+0.9*exp(-180*(t-0.075))*gt(t,0.075))':d=0.16:s=48000,highpass=f=900",
};

for (const [name, graph] of Object.entries(defs)) {
  const file = path.join(out, `${name}.wav`);
  if (fs.existsSync(file.replace('.wav', '.custom'))) {
    console.log('· se conserva el original importado:', name);
    continue;
  }
  const g = graph;
  const tmp = file.replace('.wav', '.tmp.wav');
  run('ffmpeg', ['-v', 'error', '-y', '-filter_complex', g, '-ac', '2', '-c:a', 'pcm_s16le', tmp]);
  // normalizar pico a -3 dBFS para que los niveles del EDL (volumeDb) sean comparables
  const det = run('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
  const max = Number((det.match(/max_volume: (-?[\d.]+) dB/) || [])[1] ?? 0);
  run('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', `volume=${(-3 - max).toFixed(2)}dB`, '-c:a', 'pcm_s16le', file]);
  fs.rmSync(tmp);
  console.log('✓', path.relative(process.cwd(), file));
}
