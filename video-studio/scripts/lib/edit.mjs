/**
 * Motor de edición: limpieza de silencios/muletillas/repeticiones y borrador de EDL.
 * Todas las reglas numéricas vienen de references/REFERENCE_ANALYSIS.md.
 */

export const RULES = {
  maxGap: 0.3, // [REF] hueco máximo entre palabras tras la limpieza
  padBefore: 0.08, // aire antes de la palabra (no cortar ataques consonánticos)
  padAfter: 0.09, // aire después (no cortar colas / respiración final)
  dramaticPause: 0.45, // [REF] pausa conservada antes de un veredicto o tras una pregunta
  minSegment: 0.35,
  reframeMin: 1.2, // [REF] cambio de escala cada 1.2–2.5 s
  reframeMax: 2.5,
  leadIn: 0.0, // [REF] la primera palabra suena en el frame 0
};

const norm = (w) => w.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

/** Muletillas que se eliminan automáticamente (sin valor semántico). */
export const FILLERS = new Set(['eh', 'ehh', 'ehm', 'em', 'emm', 'mm', 'mmm', 'hmm', 'aja']);
/** Muletillas que sólo se señalan para revisión (pueden tener función: "o sea" traduce). */
export const SOFT_FILLERS = new Set(['este', 'bueno', 'osea', 'digamos', 'pues', 'entonces', 'nada']);

/** Palabras que anuncian un veredicto/revelación → se conserva una pausa antes. */
const REVEAL_WORDS = new Set(['ilegal', 'delito', 'prohibido', 'depende', 'nunca', 'nadie']);

/**
 * Detecta tomas repetidas (falsos comienzos): si una frase empieza con las mismas 3 palabras
 * que otra frase posterior a < 25 s, se descarta la anterior (el creador repitió la toma).
 */
export const findRetakes = (words) => {
  const sentences = [];
  let cur = [];
  words.forEach((w, i) => {
    cur.push(i);
    const gap = i < words.length - 1 ? words[i + 1].s - w.e : 99;
    if (/[.?!¿]$/.test(w.w) || gap > 0.7) {
      sentences.push(cur);
      cur = [];
    }
  });
  if (cur.length) sentences.push(cur);
  const removed = new Set();
  const reasons = [];
  for (let a = 0; a < sentences.length; a++) {
    const A = sentences[a];
    if (A.length < 3) continue;
    const keyA = A.slice(0, 3).map((i) => norm(words[i].w)).join(' ');
    for (let b = a + 1; b < sentences.length; b++) {
      const B = sentences[b];
      if (words[B[0]].s - words[A[A.length - 1]].e > 25) break;
      const keyB = B.slice(0, 3).map((i) => norm(words[i].w)).join(' ');
      // Mismo comienzo NO basta ("Y si te quieres…" vs "Y si te sacan…" son frases distintas):
      // exigir además que la mayor parte de la frase anterior se repita en la posterior.
      const wordsA = A.map((i) => norm(words[i].w)).filter(Boolean);
      const setB = new Set(B.map((i) => norm(words[i].w)).filter(Boolean));
      const overlap = wordsA.filter((w) => setB.has(w)).length / Math.max(1, wordsA.length);
      const prefix5 = A.length >= 5 && B.length >= 5 && A.slice(0, 5).every((ia, k) => norm(words[ia].w) === norm(words[B[k]].w));
      if (keyA === keyB && B.length >= 3 && (overlap >= 0.7 || prefix5)) {
        A.forEach((i) => removed.add(i));
        reasons.push({kind: 'retake', from: words[A[0]].s, to: words[A[A.length - 1]].e, text: A.map((i) => words[i].w).join(' '), keptAt: words[B[0]].s});
        break;
      }
    }
  }
  // repetición inmediata de palabra ("el el", "que que")
  for (let i = 1; i < words.length; i++) {
    if (!removed.has(i) && norm(words[i].w) && norm(words[i].w) === norm(words[i - 1].w) && words[i].s - words[i - 1].e < 0.6 && norm(words[i].w).length <= 6) {
      removed.add(i - 1);
      reasons.push({kind: 'stutter', from: words[i - 1].s, to: words[i - 1].e, text: words[i - 1].w});
    }
  }
  return {removed, reasons};
};

/**
 * Whisper tiende a estirar la palabra anterior/posterior sobre un silencio. Se corrigen
 * las marcas con la detección acústica (FFmpeg silencedetect):
 *  - palabra que termina dentro de un silencio → e = inicio del silencio
 *  - palabra que empieza dentro de un silencio → s = fin del silencio
 *  - palabras completamente dentro de un silencio → se recolocan tras el silencio
 */
export const refineWithSilences = (words, silences = []) => {
  const out = words.map((w) => ({...w}));
  for (const sil of silences) {
    if (sil.end - sil.start < 0.3) continue;
    const inside = [];
    for (const w of out) {
      const sIn = w.s > sil.start && w.s < sil.end;
      const eIn = w.e > sil.start && w.e < sil.end;
      if (sIn && eIn) inside.push(w);
      else if (eIn && w.s <= sil.start) w.e = Math.max(w.s + 0.08, sil.start + 0.02);
      else if (sIn && w.e >= sil.end) w.s = Math.min(w.e - 0.08, sil.end - 0.02);
      else if (w.s <= sil.start && w.e >= sil.end) {
        // silencio dentro de una palabra estirada: la palabra pertenece al lado más largo
        if (sil.start - w.s >= w.e - sil.end) w.e = sil.start + 0.02;
        else w.s = sil.end - 0.02;
      }
    }
    let t = sil.end - 0.02;
    for (const w of inside) {
      const d = Math.min(0.2, w.e - w.s);
      w.s = t;
      w.e = t + d;
      t += d;
    }
  }
  // asegurar orden monotónico
  for (let i = 1; i < out.length; i++) {
    if (out[i].s < out[i - 1].e) out[i].s = out[i - 1].e;
    if (out[i].e < out[i].s + 0.05) out[i].e = out[i].s + 0.05;
  }
  return out;
};

/**
 * Limpieza: devuelve rangos a conservar (en tiempo fuente) y el detalle de lo eliminado.
 */
export const cleanup = (transcript, {keepAllFillers = false, silences = [], glossary} = {}) => {
  const words = applyGlossary(refineWithSilences(transcript.words.filter((w) => w.e > w.s), silences), glossary);
  const {removed, reasons} = findRetakes(words);
  const flags = [];
  words.forEach((w, i) => {
    const n = norm(w.w);
    if (!keepAllFillers && FILLERS.has(n)) {
      removed.add(i);
      reasons.push({kind: 'filler', from: w.s, to: w.e, text: w.w});
    } else if (SOFT_FILLERS.has(n)) flags.push({kind: 'soft-filler', at: w.s, text: w.w, note: 'Revisar: puede tener función (transición o traducción).'});
    if (w.p !== undefined && w.p < 0.55) flags.push({kind: 'low-confidence', at: w.s, text: w.w, p: w.p, note: 'Verificar ortografía/término en subtítulo.'});
  });

  const kept = words.map((w, i) => ({...w, i})).filter((w) => !removed.has(w.i));
  const ranges = [];
  const pauses = [];
  for (let k = 0; k < kept.length; k++) {
    const w = kept[k];
    const prev = kept[k - 1];
    const start = Math.max(0, w.s - RULES.padBefore);
    if (!prev) {
      ranges.push({in: start, out: w.e + RULES.padAfter, words: [w]});
      continue;
    }
    const gap = w.s - prev.e;
    const last = ranges[ranges.length - 1];
    const prevIsQuestion = /\?$/.test(prev.w);
    const isReveal = REVEAL_WORDS.has(norm(w.w));
    const dramatic = prevIsQuestion || isReveal;
    const contiguous = prev.i === w.i - 1;
    const reason = prevIsQuestion ? 'tras pregunta' : 'antes de veredicto';
    if (contiguous && gap <= RULES.maxGap) {
      // habla continua
      last.out = w.e + RULES.padAfter;
      last.words.push(w);
    } else if (contiguous && dramatic && gap <= RULES.dramaticPause) {
      // pausa con función narrativa: se conserva entera
      last.out = w.e + RULES.padAfter;
      last.words.push(w);
      pauses.push({at: round(prev.e), kept: round(gap), reason});
    } else {
      // corte. Si la pausa era dramática se deja exactamente RULES.dramaticPause de aire.
      const keep = contiguous && dramatic ? RULES.dramaticPause : RULES.padAfter + RULES.padBefore;
      const half = keep / 2;
      last.out = Math.min(prev.e + (dramatic && contiguous ? half : RULES.padAfter), w.s);
      const newIn = Math.max(last.out, w.s - (dramatic && contiguous ? half : RULES.padBefore));
      ranges.push({in: newIn, out: w.e + RULES.padAfter, words: [w]});
      if (dramatic && contiguous) pauses.push({at: round(prev.e), kept: round(keep), reason});
      if (gap > RULES.maxGap) reasons.push({kind: 'silence', from: round(prev.e), to: round(w.s), text: `${gap.toFixed(2)} s → ${keep.toFixed(2)} s`});
    }
  }
  const sourceSpeech = words.length ? words[words.length - 1].e - words[0].s : 0;
  const keptDur = ranges.reduce((a, r) => a + (r.out - r.in), 0);
  return {
    ranges: ranges.map((r) => ({in: round(r.in), out: round(r.out), text: r.words.map((w) => w.w).join(' '), words: r.words})),
    removed: reasons.sort((a, b) => a.from - b.from),
    keptPauses: pauses,
    flags,
    stats: {
      sourceDuration: transcript.duration,
      sourceSpeechSpan: round(sourceSpeech),
      outputDuration: round(keptDur),
      savedSeconds: round(transcript.duration - keptDur),
      words: kept.length,
      wordsPerSecond: round(kept.length / Math.max(0.1, keptDur)),
    },
  };
};

const round = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- narrativa

const ROLE_PATTERNS = [
  ['cta', /\b(sigue|siguenos|guarda este video|comparte|comenta)\b/],
  ['steps', /\b(que hacer|primero|segundo|reclama|denuncia ante|presenta|acude)\b/],
  ['twist', /\b(pero|sin embargo|ojo|excepcion|depende)\b/],
  ['translation', /\b(o sea|eso significa|eso se llama|es decir|en simple|traducido)\b/],
  ['legal-basis', /\b(ley|articulo|codigo|constitucion|decreto|reglamento|tribunal|indecopi|sbs|sunafil|servir|tc)\b/],
  ['reveal', /\b(ilegal|es legal|delito|no pueden|no puede|prohibido|es tu derecho)\b/],
];

export const guessRole = (text, index, total) => {
  const t = text.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (index === 0) return 'hook';
  if (index >= total - 2 && /\b(sigue|guarda|necesitar)/.test(t)) return 'cta';
  for (const [role, re] of ROLE_PATTERNS) if (re.test(t)) return role;
  return index === total - 3 ? 'recap' : 'context';
};

// ---------------------------------------------------------------- recursos sugeridos

/** Diccionario concepto → sticker [REF: emojis usados como actores/emociones]. */
export const STICKER_RULES = [
  [/\bbanco|bancos|tarjeta|credito\b/, '🏦'],
  [/\bpolicia|patrullero|detiene|detenido\b/, '👮'],
  [/\bjuez|juzgado|tribunal\b/, '👩‍⚖️'],
  [/\bprofesor|docente\b/, '👨‍🏫'],
  [/\bcolegio|escuela|salon\b/, '🏫'],
  [/\btrabajo|trabajador|jefe|empresa|puesto\b/, '💼'],
  [/\bcobro|comision|cobrarte|multa|pagar|plata|dinero\b/, '💸'],
  [/\bcontrato|firmar|documento\b/, '🧾'],
  [/\binvestigar|investigacion|fiscalia\b/, '🔍'],
  [/\bsecreto|reservad|internamente\b/, '🫢'],
  [/\bsorpres|imagina|increible\b/, '😱'],
  [/\brealmente|seguro|sospech\b/, '🤨'],
  [/\bpiensa|pregunta|sera\b/, '🤔'],
  [/\bcelular|app|redes\b/, '📱'],
  [/\bcompra|tienda|producto\b/, '🛒'],
];

const LAW_RE = /\b(ley|decreto legislativo|d\.?\s?leg\.?|decreto supremo)\s*(n[.°º]*\s*)?(\d[\d.\-\s]{2,8})/i;
const ARTICLE_RE = /\bart[ií]culo\s+(\d+[\-\s]?[a-z]?)\b/i;

export const suggestOverlays = (segmentsOut) => {
  const overlays = [];
  const sfx = [];
  let lastStickerAt = -10;
  let lawCards = 0;
  for (const seg of segmentsOut) {
    const t = seg.text.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
    const law = seg.text.match(LAW_RE);
    const art = seg.text.match(ARTICLE_RE);
    if (law && lawCards < 3) {
      const num = law[3].replace(/[\s.\-]/g, '');
      overlays.push({type: 'lawCard', title: `Ley ${num}`, subtitle: undefined, color: 'white', start: seg.start, end: Math.min(seg.end, seg.start + 2.6), auto: true, note: 'Completar subtítulo con el nombre de la norma (verificar).'});
      sfx.push({name: 'type', at: seg.start, volumeDb: -16});
      lawCards++;
      continue;
    }
    if (art && lawCards < 3) {
      overlays.push({type: 'lawCard', title: `Art. ${art[1].replace(/\s/g, '')}`, color: 'yellow', start: seg.start, end: Math.min(seg.end, seg.start + 2.2), auto: true});
      sfx.push({name: 'type', at: seg.start, volumeDb: -16});
      lawCards++;
      continue;
    }
    if (seg.start - lastStickerAt < 2.5) continue;
    const rule = STICKER_RULES.find(([re]) => re.test(t));
    if (rule) {
      overlays.push({type: 'sticker', emoji: rule[1], size: 170, start: seg.start + 0.1, end: Math.min(seg.end + 0.6, seg.start + 2.2), auto: true});
      sfx.push({name: 'pop', at: seg.start + 0.1, volumeDb: -18});
      lastStickerAt = seg.start;
    }
  }
  // [REGLA] nunca dos recursos grandes a la vez: el sticker cede ante la tarjeta de norma
  const cards = overlays.filter((o) => o.type === 'lawCard');
  const kept = overlays.filter((o) => {
    if (o.type !== 'sticker') return true;
    const clash = cards.find((c) => o.start < c.end && o.end > c.start);
    if (!clash) return true;
    if (clash.start - o.start >= 1.0) {
      o.end = clash.start - 0.05;
      return true;
    }
    return false;
  });
  const keptStarts = new Set(kept.filter((o) => o.type === 'sticker').map((o) => o.start));
  return {overlays: kept, sfx: sfx.filter((x) => x.name !== 'pop' || keptStarts.has(x.at))};
};

// ---------------------------------------------------------------- glosario

/**
 * Une números partidos por Whisper ("29" ".719" → "29719"; "30" "-057" → "30057")
 * y aplica templates/glossary.json (marca, instituciones, errores frecuentes).
 */
export const applyGlossary = (words, glossary = {corrections: []}) => {
  const merged = [];
  for (const w of words) {
    const prev = merged[merged.length - 1];
    if (prev && /\d$/.test(prev.w.replace(/[.,]$/, '')) && /^[.,\-]?\d/.test(w.w) && w.s - prev.e < 0.35) {
      prev.w = prev.w.replace(/[.,]$/, '') + w.w.replace(/^[.\-]/, '');
      prev.w = prev.w.replace(/(\d)[.,](\d{3})/g, '$1$2');
      prev.e = w.e;
      continue;
    }
    merged.push({...w});
  }
  const rules = (glossary.corrections ?? []).filter((r) => !r.onlyAfter).map((r) => ({...r, parts: r.match.split(' ')})).sort((a, b) => b.parts.length - a.parts.length);
  const out = [];
  for (let i = 0; i < merged.length; i++) {
    const rule = rules.find((r) => r.parts.every((p, k) => merged[i + k] && norm(merged[i + k].w) === p));
    if (!rule) {
      out.push(merged[i]);
      continue;
    }
    const span = merged.slice(i, i + rule.parts.length);
    const s = span[0].s;
    const e = span[span.length - 1].e;
    const trail = (span[span.length - 1].w.match(/[,.;:!?]+$/) || [''])[0];
    const step = (e - s) / rule.replace.length;
    rule.replace.forEach((r, k) => out.push({w: r + (k === rule.replace.length - 1 ? trail : ''), s: s + k * step, e: s + (k + 1) * step, p: 1, corrected: true}));
    i += rule.parts.length - 1;
  }
  return out;
};

// ---------------------------------------------------------------- EDL

/**
 * Construye el borrador de EDL a partir de los rangos limpios:
 *  1. parte rangos largos en sub-planos de 1.2–2.5 s (cortes en límites de palabra)
 *  2. alterna encuadre base ↔ subtleIn en cada corte (jump cut con cambio de escala [REF])
 *  3. punch-in en la revelación, crash zoom opcional en el hook [REF]
 *  4. remapea las palabras a la línea de tiempo final → subtítulos 1 palabra
 *  5. sugiere stickers / tarjetas de norma y SFX (marcados auto:true para aprobación)
 */
export const buildEdl = ({slug, title, source, clean, emphasisExtra = []}) => {
  const segments = [];
  const captions = [];
  let tOut = 0;
  let n = 0;
  const pieces = [];
  for (const r of clean.ranges) {
    // dividir en sub-planos por límites de palabra
    let cur = {in: r.in, words: []};
    r.words.forEach((w, idx) => {
      cur.words.push(w);
      const len = w.e - cur.in;
      const nextW = r.words[idx + 1];
      const endsSentence = /[.?!,:;]$/.test(w.w);
      if (nextW && (len >= RULES.reframeMax || (len >= RULES.reframeMin && endsSentence))) {
        const cutAt = (w.e + nextW.s) / 2;
        pieces.push({in: cur.in, out: cutAt, words: cur.words});
        cur = {in: cutAt, words: []};
      }
    });
    pieces.push({in: cur.in, out: r.out, words: cur.words});
  }
  const total = pieces.length;
  let alt = false;
  let revealDone = false;
  pieces.forEach((p, i) => {
    const text = p.words.map((w) => w.w).join(' ');
    const role = guessRole(text, i, total);
    let framing = alt ? 'subtleIn' : 'base';
    let move = 'none';
    if (i === 0) {
      framing = 'subtleIn';
      move = 'settle';
    }
    if (role === 'reveal' && !revealDone) {
      framing = 'punchIn';
      revealDone = true;
    }
    if (role === 'twist') framing = 'punchIn';
    if (role === 'cta') framing = 'base';
    alt = !alt;
    // cortes alineados a la rejilla de fotogramas (30 fps)
    p.in = Math.round(p.in * 30) / 30;
    p.out = Math.round(p.out * 30) / 30;
    const seg = {id: `s${String(++n).padStart(2, '0')}`, in: round(p.in), out: round(p.out), role, framing, move, note: text};
    segments.push(seg);
    const dur = p.out - p.in;
    p.words.forEach((w, wi) => {
      const s = tOut + (w.s - p.in);
      const nextStart = p.words[wi + 1] ? tOut + (p.words[wi + 1].s - p.in) : tOut + dur;
      const clean = w.w.replace(/^[¿¡"“(]+|[,.;:!?"”)]+$/g, '');
      if (!clean) return;
      const n0 = norm(clean);
      captions.push({
        text: clean,
        start: round(Math.max(0, s)),
        end: round(Math.max(s + 0.12, Math.min(nextStart, tOut + dur))),
        emphasis: ['ilegal', 'derecho', 'derechos', 'delito', 'ley', 'constitucion', 'prohibido', 'denunciar', 'denuncia', ...emphasisExtra].includes(n0),
      });
    });
    p.outStart = tOut;
    tOut += dur;
    p.outEnd = tOut;
  });
  const {overlays, sfx} = suggestOverlays(pieces.map((p) => ({start: round(p.outStart), end: round(p.outEnd), text: p.words.map((w) => w.w).join(' ')})));
  // [REF] título de revelación serif en el primer "…es ilegal" (1 por video)
  const revealIdx = pieces.findIndex((p) => /\b(eso|esto)?\s*es\s+ilegal\b/i.test(p.words.map((w) => w.w).join(' ')));
  if (revealIdx >= 0) {
    const p = pieces[revealIdx];
    const k = p.words.findIndex((w) => norm(w.w) === 'ilegal');
    const startW = p.words[Math.max(0, k - 2)];
    const st = round(p.outStart + (startW.s - p.in));
    overlays.push({type: 'revealTitle', lines: ['Eso es', 'ilegal'], start: st, end: round(Math.min(p.outEnd, st + 1.3)), auto: true, note: 'Ajustar el texto exacto del veredicto.'});
    sfx.push({name: 'boom', at: st, volumeDb: -20});
  }
  // whoosh en cada punch-in fuerte
  segments.forEach((s, i) => {
    if (s.framing === 'punchIn' || s.move === 'crash') sfx.push({name: 'whoosh', at: round(Math.max(0, pieces[i].outStart - 0.12)), volumeDb: -22});
  });
  return {
    slug,
    title,
    source,
    colorPreset: 'combinacion-visual',
    colorAppliedInSource: false,
    segments,
    captions,
    overlays,
    sfx: sfx.sort((a, b) => a.at - b.at),
    showSafeZones: false,
  };
};
