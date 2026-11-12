# Análisis — Video 5

## Técnica
| | Original | Proxy de edición |
|---|---|---|
| Resolución | 720x1280 | 1080x1920 |
| FPS | 30.00 | 30 |
| Duración | 177.88 s | 177.90 s |
| Códec | h264 / aac | h264 / aac |

- Loudness: **-15 LUFS** (LRA 17.3 LU, true peak 0.1 dBFS) → se normaliza a -14 LUFS en la exportación.
- Silencios (< -35 dB, ≥ 0.25 s): 72 (46.21 s en total).
- Luma media: 148.8 · Saturación media: 6.5.
- Fotogramas negros: ninguno.
- ⚠️ Resolución de origen 720x1280: se escala a 1080x1920 (posible pérdida de nitidez; limita los punch-in a ≤1.15x).
- ⚠️ Posible saturación de audio (true peak 0.1 dBFS).

## Transcripción
> ¿Me dices? Ok. ¿Sabías que cada vez compras una cerveza? Sabías que cada vez que compras una cerveza. ¿Carda gasolina? ¿Carda gasolina? ¿O alguien compra cigarros? ¿O alguien compra cigarros? Estás pagando un impuesto extra que ni siquiera aparece en el ticket? Se llama impuesto selectivo al consumo. Se llama impuesto selectivo al consumo. Y no, no cuenta como IGB. Y no, no cuenta como IGB. Son dos impuestos distintos. Son dos impuestos distintos. Son dos impuestos distintos. El IGB graba casi todo lo que compras. El IGB graba casi todo lo que compras. Pero el ICC graba productos específicos, y el ICC solo graba productos específicos, y el ICC solo graba productos específicos, alcohol, tabaco, combustibles, algunos vehículos, y hasta juegos de azar, por dos razones, recogación del estado y desincentivar su consumo, porque dañan tu salud o hacen mayor medio ambiente, porque bañan tu salud o hacen baño al medio ambiente, pero ojo, esa función es regulatoria, pero adivina quién la está sumiendo, su nato, pero ojo, legalmente lo paga el importador o ¿Qué era? Perdón. Legalmente lo debería pagar el productor o importador. Legalmente lo debería pagar el productor... O importador. Legalmente lo debería pagar el productor o importador. Pero adivina quién lo está asumiendo. Pero adivina quién lo está asumiendo. Tú, porque va incluido en el precio final. Tú, porque va incluido en el precio final. Así que la La próxima vez que veas el precio de una cerveza Y la próxima vez que veas el precio de una chela Ya sabes que hay hí? Hay un impuesto que no ves Sí abocar a Yuris y guarda este vídeo no sabes cuándo podrás necesitarlo

## Limpieza propuesta
- Duración original: 177.90 s → editada: **44.35 s** (−130.22 s).
- Ritmo resultante: **3.083 palabras/s** (referencias: 3.2–3.6).
- Eliminado: 1 elementos (1 silencios, 0 muletillas, 0 tomas repetidas, 0 tartamudeos).
- Pausas conservadas con función: 0.
- Para revisar: 18 (muletillas blandas / palabras de baja confianza).

- `74.59–74.99` **silence** 0.40 s → 0.17 s

### Revisión manual
- `24.85` low-confidence: “O” — Verificar ortografía/término en subtítulo.
- `32.59` low-confidence: “ticket.” — Verificar ortografía/término en subtítulo.
- `39.95` low-confidence: “Y” — Verificar ortografía/término en subtítulo.
- `46.35` low-confidence: “Son” — Verificar ortografía/término en subtítulo.
- `50.80` low-confidence: “El” — Verificar ortografía/término en subtítulo.
- `51.17` low-confidence: “IGV” — Verificar ortografía/término en subtítulo.
- `57.35` low-confidence: “Pero” — Verificar ortografía/término en subtítulo.
- `81.20` low-confidence: “Y” — Verificar ortografía/término en subtítulo.
- `100.45` low-confidence: “Porque” — Verificar ortografía/término en subtítulo.
- `102.80` low-confidence: “hacen” — Verificar ortografía/término en subtítulo.
- `108.86` low-confidence: “es” — Verificar ortografía/término en subtítulo.
- `119.22` low-confidence: “Pero” — Verificar ortografía/término en subtítulo.
- `139.45` low-confidence: “Pero” — Verificar ortografía/término en subtítulo.
- `146.85` low-confidence: “Tú,” — Verificar ortografía/término en subtítulo.
- `164.61` low-confidence: “¿Ya” — Verificar ortografía/término en subtítulo.
- `173.43` soft-filler: “este” — Revisar: puede tener función (transición o traducción).
- `175.65` low-confidence: “No” — Verificar ortografía/término en subtítulo.
- `91.58` off-camera-voice: “desincentivar su consumo.” — 43 % de la voz sin movimiento de labios: ¿voz detrás de cámara?
