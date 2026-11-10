# 05 · Sistema de B-roll

El B-roll es **obligatorio** en el lenguaje Revoredo. Cada pieza tiene una función narrativa. Antes de usar cualquier recurso hay que responder:

> **¿Qué parte del mensaje ayuda a entender, contextualizar o reforzar este B-roll?**
> Si no hay una respuesta clara, no se usa.

## Proceso (PASO 3 del flujo)

1. **Detectar necesidades en el guion**, antes de buscar:
   1. el problema o la situación del caso;
   2. los conceptos abstractos (consentimiento, tratamiento, compliance…);
   3. los puntos con más de 6–7 s de presentador sin cambio visual;
   4. las ideas que ganan con una imagen (riesgo, consecuencia, sector, tecnología);
   5. los puntos donde el B-roll mejora la retención sin tapar un gesto o una frase clave.
2. **Declarar cada necesidad como un slot** en `edit.json → broll[]`, con `src: null`. Campos: `phrase`, `concept`, `function`, `description`, `searchQuery`, `layout`. El canvas muestra los slots pendientes como “Por buscar”.
3. **Buscar** desde la necesidad, nunca al azar (ver fuentes abajo).
4. **Evaluar** cada candidato: relevancia literal con la frase, calidad (≥ 1080 en el lado corto para `full`), licencia, tono corporativo, que no muestre marcas ni rostros problemáticos y que su color sea compatible con el set.
5. **Registrar** el recurso en la biblioteca y **asignarlo** al slot.

```bash
npm run studio:broll -- needs <slug>                                 # slots, coincidencias locales y búsquedas sugeridas
npm run studio:broll -- search huella biometria                      # biblioteca local
npm run studio:broll -- remote pexels "fingerprint scanner macro"    # stock (requiere API key)
npm run studio:broll -- add <archivo|url> --id fingerprint-macro-01 \
     --concept "Huella dactilar / biometría" --tags huella,biometria,datos \
     --provider "Pexels" --license "Pexels License" --source-url <url>
npm run studio:broll -- assign <slug> B01 fingerprint-macro-01 --trim 1.2
```

`add` hace tres cosas:

- normaliza el video a H.264, yuv420p y sin audio;
- mide la resolución y la marca como `low` si no alcanza;
- lo registra en `b-roll/library.json` con su proveedor, su licencia y los proyectos donde se usó.

## Fuentes y conectores

| Fuente | Cómo se usa | Licencia |
|---|---|---|
| **Biblioteca propia** (`b-roll/library.json`) | Primero se reutiliza lo ya aprobado | Registrada por asset |
| **Raw del rodaje** | Planos de detalle (manos, documentos, oficina) grabados junto al presentador | Propio |
| **Google Drive** (conector) | Footage institucional, capturas de resoluciones y fotos del equipo | Propio. Confirmar permisos de las personas |
| **Pexels / Pixabay** (API) | Stock de video. Requiere `PEXELS_API_KEY` o `PIXABAY_API_KEY` en el entorno | Uso libre con condiciones de cada licencia |
| **Canva** (conector) | Imágenes del kit de marca, generación de imagen y fondos para tarjetas | Según la licencia de Canva |
| **Generación IA** (skills de video/imagen) | Conceptos sin stock adecuado (p. ej. “consentimiento previo” abstracto) | Revisar los términos del proveedor. Nunca recrear personas ni marcas reales |

## Criterios de selección

- **Relevante y literal:** la imagen corresponde a la palabra que suena (match palabra-imagen).
- **Corporativo:** se prefieren detalles (manos, lector biométrico, contrato, pantalla) sobre personas genéricas posando.
- **Limpio:** sin texto ni logos de terceros y con poco ruido visual.
- **Calidad:** de 1080 × 1920 hacia arriba, ≥ 25 fps, sin compresión visible. Las imágenes fijas llevan Ken Burns lento.
- **Color:** compatible con el set (fríos o neutros, o cálidos controlados). Los ajustes `grade` disponibles son `cool`, `warm` y `mono`.
- **Duración:** de 1,5 a 4 s por pieza. Si el concepto se repite, se cambia de plano y no se alarga.

## Layouts

| Layout | Cuándo |
|---|---|
| `full` | Por defecto, como en la referencia. La voz sigue por debajo |
| `split-top` | Hay que ver al presentador y la imagen a la vez (p. ej. una demostración) |
| `card` | Documentos, capturas o resoluciones: material de menor resolución que no debe ocupar toda la pantalla |

## Mapa de conceptos frecuentes

| Concepto | Ideas de B-roll |
|---|---|
| Datos personales | Pantallas con datos difuminados, bases de datos, formularios web |
| Datos sensibles / biometría | Huella macro, lector biométrico, reconocimiento facial |
| Consentimiento | Firma de contrato, checkbox en pantalla, mano que duda antes de firmar |
| Autoridad / sanción | Edificio institucional, documento sellado, mazo (con moderación) |
| Empresa expuesta | Sala de directorio, ejecutivos revisando un informe, titular de noticia |
| Fintech / pagos | Billetera digital en el móvil, POS, transferencias |
| Inversión extranjera / soft landing | Skyline de Lima, aeropuerto, reunión internacional |
| Laboral / SUNAFIL | Planilla, oficina operativa, inspección |
