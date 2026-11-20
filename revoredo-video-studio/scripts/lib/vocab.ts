/**
 * Shared vocabulary (Spanish labels + criteria) used by the canvas and docs.
 * Mirrors documentation/04-codigos-nativos.md.
 */
export const roleInfo = {
  hook: { label: "Hook", question: "¿Por qué debería quedarme?" },
  context: { label: "Contexto", question: "¿Qué pasó?" },
  tension: { label: "Tensión", question: "¿Dónde está el riesgo real?" },
  development: { label: "Desarrollo", question: "¿Cómo funciona?" },
  reveal: { label: "Reveal", question: "¿Cuál es la clave?" },
  resolution: { label: "Solución", question: "¿Qué debo hacer?" },
  cta: { label: "CTA", question: "¿Cuál es el siguiente paso?" },
} as const;

export const codeInfo = {
  hook: { label: "Hook", solves: "Abandono en los primeros 1–3 s: el espectador no sabe si el video es para él.", corporate: "Pregunta directa o dato concreto; nunca clickbait ni exageración." },
  antihook: { label: "Antihook", solves: "Predictibilidad: el espectador cree saber el final.", corporate: "Negar la hipótesis obvia con un hecho (“el problema no fue la biometría”)." },
  reveal: { label: "Reveal", solves: "Falta de recompensa: se entrega la clave prometida.", corporate: "Punch-in + texto estratégico breve; sin efectos de sonido estridentes." },
  "build-up": { label: "Build-up", solves: "Monotonía en el desarrollo: la información no escala.", corporate: "Acumular datos (cifra → autoridad → sanción) con cortes que se acortan." },
  "pattern-interrupt": { label: "Pattern interrupt", solves: "Habituación visual tras ~3–5 s del mismo plano.", corporate: "Cambio de plano o B-roll pertinente; nunca un efecto ajeno al tema." },
  "match-cut": { label: "Match cut", solves: "Saltos bruscos entre ideas.", corporate: "Unir por forma/acción (mano → huella) para dar continuidad elegante." },
  reframe: { label: "Reencuadre", solves: "Corte en la misma toma que se percibe como error (jump-cut).", corporate: "Reencuadre digital discreto que convierte el corte en cambio de plano." },
  "scale-change": { label: "Cambio de escala", solves: "Planos iguales consecutivos.", corporate: "Alternar medium ↔ close en cada corte directo." },
  "punch-in": { label: "Punch-in", solves: "La frase clave no se distingue del resto.", corporate: "Acercamiento lento (≤ 6 %) o salto a close; nunca zoom rápido o con rebote." },
  "strategic-text": { label: "Texto estratégico", solves: "Ideas complejas o cifras que se pierden en el audio.", corporate: "Máx. 7 palabras, serif, un único acento dorado." },
  "visual-stimulus": { label: "Estímulo visual", solves: "Caída de atención en bloques explicativos.", corporate: "Línea, dato o B-roll minimalista; nada decorativo." },
  "audio-stimulus": { label: "Estímulo auditivo", solves: "Transición de bloque que pasa desapercibida.", corporate: "Whoosh/tick suave bajo la voz (≤ 0.4); máx. uno cada 6–8 s." },
  "rhythm-change": { label: "Cambio de ritmo", solves: "Ritmo plano en todo el video.", corporate: "Acelerar en build-up, dar aire (plano más largo) al payoff." },
  "retention-loop": { label: "Loop de retención", solves: "Falta de motivo para llegar al final.", corporate: "Abrir pregunta en el hook y cerrarla en el payoff/CTA." },
  "open-loop": { label: "Open loop", solves: "El espectador no tiene una pregunta pendiente.", corporate: "Anticipar sin revelar (“fue algo que casi ninguna empresa hace bien”)." },
  payoff: { label: "Payoff", solves: "Cierre sin aprendizaje concreto.", corporate: "Regla práctica clara, enunciada con autoridad." },
} as const;
