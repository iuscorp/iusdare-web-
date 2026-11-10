# 01 · Videos de referencia

Cada referencia se analiza por ingeniería inversa en `references/<id>/analisis.md`. El análisis cubre:

- hook, estructura y ritmo;
- cortes, encuadres y textos;
- B-roll, motion graphics y sonido;
- énfasis, cierre y CTA.

Los principios que se extraen se integran en `03-lenguaje-audiovisual.md` y `04-codigos-nativos.md`.

| ID | Tema | Análisis |
|---|---|---|
| 01 | Caso gimnasio: huella digital y consentimiento (ANPD, 27 UIT) | [analisis.md](../references/revoredo-caso-gimnasio-biometria/analisis.md) |

## Agregar una referencia nueva

1. `npm run studio:new -- ref-<tema> --source <video>` y `npm run studio:analyze -- ref-<tema>`. Así se obtienen la ficha técnica, las pausas, los cambios de plano y la transcripción.
2. Crear `references/<id>/analisis.md` con la misma estructura que la referencia 01: timeline medida, métricas, lenguaje extraído y tabla de criterios.
3. Si aparecen criterios nuevos o que contradicen los existentes, actualizar `03` y `04`.
