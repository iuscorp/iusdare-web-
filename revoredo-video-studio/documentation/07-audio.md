# 07 · Audio

Código: `src/audio/AudioBed.tsx`. Normalización en `scripts/render.ts`.

| Elemento | Criterio |
|---|---|
| **Voz** | Es la protagonista. Ganancia por segmento con `gainDb` y global con `voiceGainDb` |
| **Loudness del export** | −14 LUFS integrados y −1 dBTP. Se aplica automáticamente con loudnorm en dos pasadas |
| **Música** | Opcional. Corporativa, sin letra, de tempo medio o bajo, ≈ 20 dB por debajo de la voz (`volume` 0,08–0,14). Baja un poco más bajo el B-roll (`duckedVolume`) y tiene fade in/out |
| **Efectos (SFX)** | Puntuación, no decoración: whoosh o tick suave en un cambio de bloque, un “pop” discreto en un dato. Volumen ≤ 0,4, entre 0 y 4 por video |
| **Silencios** | Se eliminan en la edición. El QC alerta si quedan silencios de más de 1,2 s en el cuerpo |

Archivos: `public/audio/music/` y `public/audio/sfx/`, con licencia registrada en `public/audio/LICENSES.md`.

La referencia no tiene SFX audibles y parece tener una cama musical muy baja. Por defecto, el estudio entrega voz sola y agrega música o SFX solo si el brief lo pide.

Ejemplo:

```json
"audio": {
  "voiceGainDb": 0,
  "music": { "src": "audio/music/corporate-pulse-01.mp3", "volume": 0.1, "duckedVolume": 0.07 },
  "sfx": [{ "src": "audio/sfx/soft-whoosh.wav", "at": 7.3, "volume": 0.3, "why": "Entrada al caso (B-roll huella)" }]
}
```
