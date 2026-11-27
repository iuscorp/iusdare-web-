# Referencia 01: caso gimnasio y biometría (ingeniería inversa)

**Archivo:** `Revoredo-Abogados-fdown.net_2.mp4`. No se versiona: el video queda en Drive o en la carpeta de referencias de la persona responsable.
**Técnica:** 720×1280 (9:16), 30 fps, 52,4 s, H.264 + AAC 44,1 kHz estéreo y 1,5 Mb/s.
**Audio:** −14,6 LUFS integrados, true peak −0,9 dBFS y LRA 6,4 LU. No hay pausas ≥ 0,3 s por debajo de −35 dB.
**Guion fuente:** Drive, `REVOREDO.PE (Abogados Digitales)/GUIONES` → pestaña “caso gym”. Coincide palabra por palabra con la locución.

Evidencia en esta carpeta:

- `frames-2fps.jpg`: hoja de contacto a 2 fps.
- `presenter-cuts.jpg`: pares de fotogramas antes y después de cada corte del presentador.
- `transcript.json`: transcripción con tiempo por palabra (faster-whisper, verificada contra el guion).
- `logo-bug.png`: recorte del bug de marca.

---

## 1. Estructura medida (timeline real)

Los tramos se clasificaron a 10 fps comparando cada fotograma con el plano del presentador. Los flashes se detectaron por luminancia.

| Tramo (s) | Imagen | Locución | Rol narrativo |
|---|---|---|---|
| 0,0 – 2,0 | Presentador | “¿Vas al gym y accedes al local con tu huella?” | **Hook** (pregunta de identificación) |
| 2,0 – 3,7 | Presentador (corte) | “¡Cuidado! Estos son datos sensibles.” | Hook: alerta y categoría jurídica |
| 3,7 – 7,2 | Presentador (corte) | “Este año multaron a un gimnasio arequipeño con más de S/ 139 mil…” | Contexto y dato |
| 7,2 | **Flash cálido** (3 fotogramas) | | Marca de bloque |
| 7,6 – 9,7 | B-roll: huella dactilar macro (naranja → turquesa) | “…por recopilar la huella digital de sus socios.” | Contexto visual |
| 9,7 – 15,2 | Presentador (cortes en 11,3 y 14,0) | “El problema no fue usar biometría: fue algo que casi ninguna empresa hace correctamente. Una socia denunció…” | **Antihook + open loop** |
| 15,2 – 18,1 | B-roll: mujer entrenando (polea) | “…tras renovar su membresía, se le exigió registrar su huella para ingresar…” | Relato (match palabra-imagen: *membresía*) |
| 18,1 – 20,2 | Presentador | “…sin un consentimiento expreso, informado ni específico.” | Desarrollo |
| 20,3 | Flash | | |
| 20,6 – 23,2 | B-roll: hombre con reflejos de datos y código | “La Autoridad Nacional de Protección de Datos Personales…” | Autoridad y tecnología |
| 23,2 – 25,5 | Presentador | “…determinó que el gimnasio tenía 7,132 huellas…” | Build-up (cifra 1) |
| 25,7 | Flash | | |
| 26,0 – 28,5 | B-roll: mancuernas en clave baja, termina en negro | “…de 3,566 titulares y que el tratamiento era excesivo…” | Build-up (cifra 2) |
| 28,5 – 35,9 | Presentador | “…pues la identidad podía verificarse con el DNI. La sanción: 27 UIT. Pero el punto central no fue solo la proporcionalidad.” | Sanción y **reveal** |
| 35,9 – 39,8 | B-roll: mujer con mancuerna | “La usuaria conoció esta exigencia después de haber pagado y firmado el contrato.” | La clave del caso |
| 39,8 | Flash | | |
| 39,9 – 42,7 | Presentador | “Cuando el consentimiento no es previo, específico e informado…” | **Payoff** (regla) |
| 42,8 | Flash | | |
| 43,1 – 45,8 | B-roll: dos ejecutivos en una sala de reuniones | “…la empresa queda expuesta, sin importar cuán segura sea la tecnología.” | Traslado al cliente (empresa) |
| 45,8 | Flash | | |
| 46,2 – 52,3 | Presentador | “Sigue a @revoredope y recuerda: si tu empresa trata datos sensibles, tenemos una conversación pendiente. ¡Escríbenos!” | **CTA** (cierra el loop del hook) |

### Métricas

| Métrica | Valor |
|---|---|
| Duración | 52,4 s |
| Bloques de B-roll | 6, con una cobertura aproximada de 16,6 s (≈ 32 %) |
| Frecuencia de B-roll | Uno cada 6–8 s; nunca más de 7 s seguidos de presentador sin B-roll ni corte |
| Cambio visual (cortes + entradas de B-roll) | Cada ≈ 3–4 s |
| Plano del presentador | Entre 1,6 s y 7,4 s; mediana ≈ 3 s |
| Ritmo de habla | ≈ 200 palabras/min (rápido, sin pausas) |
| Pausas | Ninguna ≥ 0,3 s: el ritmo se construye editando los silencios |
| Flashes | 6, siempre a la entrada o salida de un B-roll que abre un bloque nuevo |

---

## 2. Lenguaje audiovisual extraído

### Hook

- Pregunta en segunda persona que segmenta al público (“¿Vas al gym…?”). En 2 s queda claro **para quién** es el video.
- Sigue de inmediato una alerta de 1,5 s (“¡Cuidado! Datos sensibles”) que **nombra la categoría jurídica**. Antes del segundo 4 el espectador ya sabe qué está en juego.
- A los 7 s llega el primer dato duro (S/ 139 mil): convierte el riesgo en consecuencia.

### Estructura narrativa

Hook → contexto con cifra → **antihook** (“el problema no fue la biometría”) → **open loop** (“fue algo que casi ninguna empresa hace bien”) → relato del caso → build-up de cifras (7,132 huellas · 3,566 titulares · DNI · 27 UIT) → **reveal** (“el punto central no fue solo la proporcionalidad”) → **payoff** (consentimiento previo, específico e informado) → traslado a la empresa del espectador → CTA de firma.

La pregunta abierta en el segundo 11 se responde recién en el 36–42. Ese es el **loop de retención** del video.

### Ritmo y cortes

- Solo cortes directos. No hay transiciones de catálogo.
- Los cortes del presentador son **jump-cuts sobre el mismo encuadre**: plano medio-amplio, de la cabeza a las rodillas, con la presentadora centrada. Casi no hay cambio de escala (ver `presenter-cuts.jpg`).
- El ritmo lo sostienen la locución sin pausas y la alternancia presentador / B-roll.

### Encuadre

- Toma fija en 9:16, plano medio-amplio y presentadora centrada.
- El rostro ocupa entre el 27 % y el 46 % de la altura y los ojos quedan al 38 %.
- Hay espacio negativo arriba (pared clara de oficina con acento turquesa) y la silla ejecutiva queda detrás.
- Vestuario: blazer negro y rayas diplomáticas. Comunica autoridad sin rigidez.
- **Oportunidad:** la toma tiene margen para reencuadres digitales. El estudio los usa para convertir los jump-cuts en cambios de escala (medium ↔ close).

### Textos

- Subtítulo palabra a palabra, de 2 a 4 palabras por grupo, en **serif itálica blanca**, centrado al 64 % de la altura, sin caja y con sombra suave. Es el único texto en pantalla.
- **Oportunidad:** las cifras (S/ 139 mil, 7,132, 27 UIT) y los requisitos del consentimiento solo existen en el audio. Un dato o checklist breve mejora la comprensión sin recargar.

### B-roll

- Es de stock cinematográfico, de alta calidad y con color cuidado.
- Cada pieza ilustra **literalmente** la frase que la acompaña: *huella* → huella; *membresía* → gimnasio; *Autoridad… Datos Personales* → tecnología y datos; *empresa expuesta* → reunión ejecutiva.
- Se usa a pantalla completa, con la voz continuando por debajo.
- Riesgo detectado: dos clips de gimnasio con personas en ropa deportiva. Funcionan para el caso, pero conviene priorizar planos de detalle (lector biométrico, torniquete, recepción) que se mantengan en el tono corporativo.
- Defecto técnico: el clip de mancuernas termina en negro (≈ 28,1 s). El QC del estudio lo detecta.

### Motion graphics y recursos

- **Bug de marca:** botón “power” dorado en la esquina superior derecha durante todo el video.
- **Flash cálido** (luz dorada o naranja de 3–5 fotogramas) a la entrada de cada bloque de B-roll. Es el único efecto del video.
- No hay lower third, tarjetas ni datos animados.

### Sonido

- La voz es protagonista, con compresión fuerte y sin silencios.
- Al final, después de “¡Escríbenos!”, queda nivel residual (≈ −29 dB RMS). Esto sugiere una cama musical o un ambiente muy bajo. No hay efectos de sonido evidentes.

### Énfasis

- El énfasis lo da la entonación y los gestos de la presentadora: dedo índice en el hook y en el CTA, y manos en “previo, específico e informado”.
- La edición no lo subraya. **Oportunidad:** usar un punch-in o un texto estratégico solo en 3–4 frases clave.

### Cierre y CTA

- La firma verbal de marca es: “Si tu empresa trata datos sensibles, **tenemos una conversación pendiente**”.
- Retoma “datos sensibles” del segundo 3: el video **cierra su propio loop**.
- Agrega una acción directa (“¡Escríbenos!”) y el handle **@revoredope**.
- No tiene end card. **Oportunidad:** un end card breve (2 s) con el logo y el handle.

---

## 3. Principios convertidos en criterios del estudio

| Observado en la referencia | Criterio del estudio |
|---|---|
| Pregunta de identificación + categoría jurídica antes de 4 s | Todo hook = público objetivo + riesgo nombrado (≤ 4 s) |
| Dato duro antes de 8 s | Primera cifra o consecuencia antes de 8 s |
| Antihook + open loop en 9–14 s | Abrir una pregunta explícita en el primer tercio y cerrarla en el payoff |
| B-roll cada 6–8 s y literal a la frase | Nunca más de 7 s sin cambio visual; cada B-roll ilustra la frase que acompaña |
| Flash solo al entrar a bloques de B-roll | Acentos de corte solo en cambios de bloque (máx. 1 cada 6 s) |
| Jump-cuts sin cambio de escala | **Mejora:** alternar preset de encuadre en cada corte del presentador |
| Cifras solo habladas | **Mejora:** DataCard o KeyPoints para cifras y requisitos |
| Subtítulo serif itálico blanco al 64 % | Estilo de subtítulo oficial (`Captions.tsx`) |
| Bug dorado arriba a la derecha | `LogoBug` permanente fuera del end card |
| CTA “tenemos una conversación pendiente” | Firma de cierre por defecto (`brand.signatureCta`) |
| Fin de B-roll en negro | QC automático de fotogramas negros |

La reconstrucción de esta referencia en formato EDL, con las mejoras aplicadas, está en `edl-prueba-sistema.json`. Se usó como prueba integral del sistema; ver `documentation/12-prueba-de-sistema.md`.
