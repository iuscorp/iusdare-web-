# AGENTS.md — Smart Booking

> Fuente principal de instrucciones para **todos** los agentes (humanos o IA) que trabajen en este proyecto.
> Si un directorio tiene su propio `AGENTS.md`, sus reglas **se suman** a estas (y prevalecen en caso de conflicto local).

---

## 1. Objetivo del proyecto

Plataforma de agendamiento propia (estilo Calendly / Cal.com, sin copiar sus interfaces) para que terceros reserven
reuniones con la titular mediante **tres enlaces públicos independientes**:

| Modalidad | URL pública | Duración | Pago |
|---|---|---|---|
| Entrevista – Vocare Iuris | `/booking/vocare-iuris` | 30 min | No |
| Cafecito virtual \| Reunión de sinergias | `/booking/cafecito-virtual` | 30 min | No |
| Asesoría profesional | `/booking/asesoria` | 45 min | Sí (Stripe Checkout) |

Las tres comparten **un único motor de disponibilidad** que intersecta:

1. El horario semanal habilitado (zona `America/Lima`) y sus excepciones.
2. Los bloques ocupados de **Google Calendar** (calendario principal y destino de todas las reservas).
3. Los bloques ocupados de **Microsoft Calendar** (solo lectura, vía Microsoft Graph).
4. Las reservas activas propias (reservas temporales incluidas).

**Criterio de éxito:** toda reunión confirmada existe en Google Calendar, con la duración correcta, sin conflictos.

## 2. Arquitectura general

Monolito modular **Next.js (App Router)** con capas estrictas:

```
UI (src/app, src/components)            ← React Server/Client Components, sin secretos
   │  fetch JSON / Server Actions
API (src/app/api/**/route.ts, actions)  ← validación zod, rate limit, auth admin
   │
Servicios de dominio (src/server/**)    ← lógica de negocio, sin dependencias de UI
   ├─ availability/  motor puro + recolección de ocupados
   ├─ calendars/     adaptadores Google / Microsoft / fake (interfaz común)
   ├─ bookings/      ciclo de vida de reservas, holds, confirmación
   ├─ payments/      Stripe Checkout + webhooks
   ├─ auth/          sesiones de administrador
   └─ security/      cifrado, rate limit, request utils
   │
Persistencia (Prisma → PostgreSQL)     ← constraint EXCLUDE anti-solapamiento
```

Documento detallado: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Contratos entre módulos (no romper sin coordinación)

- `src/server/availability/engine.ts` → función **pura** `computeSlots(input): Slot[]`. Sin I/O. Toda la lógica de
  horario/zona/buffers vive aquí y está cubierta por tests unitarios.
- `src/server/calendars/types.ts` → interfaz `BusySource` (`getBusy(range)`) y `EventDestination`
  (`createEvent`, `updateEvent`, `deleteEvent`). Cualquier proveedor nuevo implementa estas interfaces.
- `src/server/bookings/service.ts` → `createBooking`, `confirmBooking`, `cancelBooking`, `rescheduleBooking`,
  `expireStaleHolds`. Es el **único** módulo que cambia `Booking.status`.
- `src/lib/forms/schema.ts` → definición declarativa de formularios (`FormField[]`) + `buildAnswersSchema()` (zod).
  Un tipo de reunión nuevo = una fila en `meeting_types` con su `formFields`; no requiere código nuevo.

## 3. Stack tecnológico

| Capa | Elección | Motivo |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript estricto | Frontend + backend en un despliegue, RSC, route handlers |
| Estilos | Tailwind CSS 3.4 | Sistema de diseño por tokens, mobile-first |
| BD | PostgreSQL 14+ | `EXCLUDE USING gist` sobre `tstzrange` → imposibilidad física de doble reserva |
| ORM | Prisma 6 | Migraciones versionadas, tipos generados |
| Fechas | Luxon | Zonas IANA y horario de verano correctos |
| Validación | zod | Validación de entrada en backend (y reutilizada en frontend) |
| Pagos | Stripe SDK oficial (Checkout + webhooks firmados) | |
| Calendarios | REST directo (`fetch`) a Google Calendar API v3 y Microsoft Graph v1.0 | Sin SDKs pesados, fácil de testear |
| Tests | Vitest (unit + integración contra PostgreSQL real) | |

## 4. Convenciones de código

- TypeScript `strict` + `noUncheckedIndexedAccess`. Prohibido `any` salvo en adaptadores de respuestas externas,
  y siempre validado/estrechado inmediatamente.
- Código y nombres en **inglés**; textos visibles al usuario en **español** (es-PE).
- Archivos `kebab-case.ts`; componentes React `PascalCase.tsx`.
- Todo lo que toque secretos, BD o APIs externas vive en `src/server/**` e importa `"server-only"`.
- `src/lib/**` es isomórfico (cliente y servidor): **nunca** importar `src/server/**` desde ahí.
- Fechas: se almacenan y transportan en **UTC ISO-8601**; solo se convierten a zona local en el borde (UI / eventos).
- Dinero: enteros en la unidad mínima de la moneda (`priceAmount`, céntimos). Nunca `float`.
- Errores de dominio: lanzar `DomainError(code, message, httpStatus)` (`src/server/errors.ts`); los route handlers
  los traducen con `toErrorResponse()`. Nunca filtrar stack traces ni mensajes de proveedores al cliente.
- Commits pequeños y descriptivos. No reformatear archivos ajenos.

## 5. Estructura de carpetas

```
smart-booking/
├─ AGENTS.md                ← este archivo
├─ docs/                    ← arquitectura, credenciales, despliegue, decisiones (ADR)
├─ prisma/                  ← schema.prisma, migrations/, seed.ts
├─ src/
│  ├─ app/
│  │  ├─ booking/[slug]/    ← páginas públicas de reserva
│  │  ├─ booking/status/    ← estado / confirmación de reserva
│  │  ├─ admin/             ← panel (login, setup, dashboard…)
│  │  └─ api/               ← route handlers (public, admin, oauth, webhooks, cron)
│  ├─ components/           ← UI (booking/, admin/, ui/)
│  ├─ lib/                  ← código isomórfico (formularios, formato de fechas, tipos DTO)
│  └─ server/               ← dominio y servicios (server-only)
└─ tests/
   ├─ unit/                 ← lógica pura (motor, formularios, cifrado)
   └─ integration/          ← contra PostgreSQL real (concurrencia, flujos, webhooks)
```

## 6. Reglas de seguridad (obligatorias)

1. **Ningún secreto en el frontend.** Variables sin prefijo `NEXT_PUBLIC_` y solo leídas desde `src/server/env.ts`.
2. Tokens OAuth **cifrados en reposo** (AES-256-GCM, `ENCRYPTION_KEY`). Nunca loguearlos ni devolverlos por API.
3. OAuth con parámetro `state` firmado (HMAC) + cookie httpOnly; PKCE en Microsoft.
4. Webhooks de Stripe: verificar firma con `STRIPE_WEBHOOK_SECRET` sobre el **raw body**; idempotencia por `event.id`.
5. Validar **toda** entrada en backend con zod. El frontend valida solo por UX.
6. Prisma con consultas parametrizadas; `$queryRaw` solo con tagged templates (nunca `$queryRawUnsafe` con input).
7. Rate limiting en endpoints públicos, login y OAuth (`src/server/security/rate-limit.ts`).
8. Panel admin: sesión en cookie `httpOnly; Secure; SameSite=Lax`, token aleatorio de 256 bits guardado como hash
   SHA-256. Mutaciones vía Server Actions (protección de origen de Next) o route handlers con `assertSameOrigin()`.
9. Datos personales: mínimos necesarios, nunca en logs (el logger redacta `email`, `phone`, `token`, etc.).
   La página de estado de una reserva exige un token de acceso propio de la reserva.
10. Fallar **cerrado**: si un calendario conectado no responde, no se ofrecen horarios (mejor no mostrar que
    ofrecer un horario ocupado).

## 7. Estándares de UX/UI

- Identidad visual **Revoredo IusCorp** con lenguaje iOS: azul marino `#102438` (dominante), guinda `#621410` (acento), gris claro `#E2E2E2`, blanco. Fondos agrupados `#F2F2F4`, superficies translúcidas, radios amplios, curvas `ease-ios` (cubic-bezier(.32,.72,0,1)) y respuesta táctil (scale .97);
  tipografías: serif editorial Playfair Display para titulares (alternando romana + *cursiva*), Inter para texto. Sin colores saturados ni clichés jurídicos.
- Mobile-first; táctil ≥ 44 px; contraste AA; foco visible; `aria-live` para estados de carga/errores.
- Flujo: tipo de reunión → fecha → horario → formulario → (pago) → confirmación, con indicador de progreso.
- Nunca mostrar horarios no disponibles: los días sin horarios se deshabilitan; si un horario se pierde entre la
  selección y el envío, se informa con claridad y se refresca la lista.
- Selector de zona horaria (detecta la del navegador; muestra la hora en la zona elegida).
- Estados vacíos, de carga (skeletons) y de error siempre diseñados; mensajes en lenguaje claro.

## 8. Reglas de integraciones

- **Google Calendar** = destino único de reservas + fuente de ocupados (`freeBusy`). Eventos con id determinista
  derivado del id de la reserva → reintentos idempotentes (409 = ya existe).
- **Microsoft Graph** = solo lectura (`calendarView`). Bloquean: `busy`, `oof`, `tentative`. Nunca crear eventos ahí.
- Renovación automática de tokens (margen de 60 s). `invalid_grant` ⇒ integración en `ERROR` y aviso en el panel.
- Cada llamada externa registra un `SyncLog` (proveedor, operación, éxito/fallo, duración) sin datos personales.
- **Stripe**: la reserva solo pasa a `CONFIRMED` tras `checkout.session.completed` con `payment_status = paid`
  (o `async_payment_succeeded`) y la creación exitosa del evento en Google.
- Timeouts de red de 10 s en todas las llamadas externas.

## 9. Variables de entorno

- Definidas y validadas en `src/server/env.ts` (zod). Documentadas en `.env.example`.
- `UPPER_SNAKE_CASE`, agrupadas por prefijo: `GOOGLE_*`, `MICROSOFT_*`, `STRIPE_*`.
- Solo `NEXT_PUBLIC_*` llega al navegador (actualmente ninguna es necesaria).
- `DEV_FAKE_CALENDARS=true` habilita calendarios simulados **solo** si `NODE_ENV !== "production"`.

## 10. Reglas de testing

- `npm test` debe pasar antes de cualquier commit.
- Lógica pura (motor, formularios, cifrado): tests unitarios con casos de borde (DST, medianoche, buffers, aviso mínimo).
- Concurrencia y flujos de reserva: tests de integración contra PostgreSQL real (`TEST_DATABASE_URL`).
- Los adaptadores externos se prueban con `fetch` simulado; nunca llamar a APIs reales en tests.
- Un bug corregido = un test que lo reproduce.

## 11. Criterios de aceptación

- [ ] Tres URLs públicas funcionando con formulario, duración y configuración propias.
- [ ] Un evento ocupado en Google **o** en Microsoft elimina ese horario en las **tres** modalidades.
- [ ] Disponibilidad recalculada en cada visita y re-verificada (contra calendarios en vivo) antes de reservar y antes de crear el evento.
- [ ] Dos solicitudes simultáneas sobre el mismo horario ⇒ exactamente una gana (constraint en BD).
- [ ] Asesoría: reserva temporal con expiración; confirmada solo tras webhook válido de Stripe.
- [ ] Si falla la creación del evento en Google, la reserva **no** se muestra como confirmada.
- [ ] Panel protegido: KPIs, filtros, detalle, cancelar, reprogramar, disponibilidad, excepciones, precio, integraciones, pagos.
- [ ] Ningún secreto/token en el bundle del cliente ni en logs.

## 12. Trabajo multiagente

| Agente | Responsabilidad | Propiedad de archivos |
|---|---|---|
| 1 · Software Architect | Arquitectura, modelo de datos, contratos | `AGENTS.md`, `docs/ARCHITECTURE.md`, `prisma/` |
| 2 · UX/UI Designer | UI pública y panel | `src/app/(public)`, `src/app/booking/**`, `src/app/admin/**` (UI), `src/components/**`, `tailwind.config.ts`, `globals.css` |
| 3 · Calendar Integration Engineer | Google, Microsoft, motor de disponibilidad | `src/server/calendars/**`, `src/server/availability/**`, `src/app/api/oauth/**` |
| 4 · Backend Engineer | Endpoints, auth, reservas, validaciones | `src/server/bookings/**`, `src/server/auth/**`, `src/server/security/**`, `src/app/api/**` (salvo oauth/webhooks) |
| 5 · Payments Engineer | Stripe, webhooks, holds | `src/server/payments/**`, `src/app/api/webhooks/**` |
| 6 · QA Engineer | Pruebas funcionales, integración, seguridad, concurrencia | `tests/**` |

Reglas de coordinación:

1. Cada agente modifica **solo** sus archivos. Cambios en archivos de otro agente ⇒ coordinarlo (o dejar nota en `docs/DECISIONS.md`).
2. Cambios de contrato (sección 2) o de esquema ⇒ los aprueba el Architect y se documentan en `docs/DECISIONS.md`.
3. Toda decisión no trivial se registra en `docs/DECISIONS.md` (formato ADR corto: contexto, decisión, consecuencias).
