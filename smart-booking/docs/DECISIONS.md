# Registro de decisiones (ADR)

Formato: **Contexto → Decisión → Consecuencias**. Las decisiones se numeran y no se borran (se marcan como reemplazadas).

## ADR-001 · Monolito modular Next.js + PostgreSQL
- **Contexto:** se necesita frontend premium, API, webhooks, OAuth y jobs, mantenidos por un equipo pequeño.
- **Decisión:** Next.js 15 (App Router) con capas `app → server/* → Prisma`. Sin microservicios.
- **Consecuencias:** un solo despliegue; los módulos de `src/server` tienen contratos explícitos y podrían extraerse a servicios si el volumen lo justificara.

## ADR-002 · Doble reserva imposible a nivel de base de datos
- **Contexto:** la prevención de dobles reservas es crítica y la app puede correr en varias instancias.
- **Decisión:** constraint `EXCLUDE USING gist (tstzrange(blockedStartAt, blockedEndAt) WITH &&) WHERE status IN (PENDING, PAYMENT_PENDING, CONFIRMED)`.
  Locks en memoria o checks "leer-y-luego-escribir" no son suficientes.
- **Consecuencias:** el INSERT perdedor recibe SQLSTATE 23P01 → `SLOT_UNAVAILABLE` (409). Se requiere PostgreSQL (no MySQL/SQLite).

## ADR-003 · Disponibilidad siempre en vivo, fallando cerrado
- **Contexto:** no se puede asumir disponibilidad a partir de la BD.
- **Decisión:** cada consulta y cada confirmación consulta Google `freeBusy` y Microsoft `calendarView` en paralelo, sin caché. Si una integración conectada falla, se devuelve 503 y no se muestran horarios.
- **Consecuencias:** mayor latencia (~300–800 ms) a cambio de exactitud. Si Microsoft falla, la página de reservas queda temporalmente sin horarios (preferible a un conflicto).

## ADR-004 · Verificaciones de disponibilidad en 4 puntos
1. Al consultar el calendario (`GET /api/availability`).
2. Al seleccionar el horario: la UI vuelve a pedir disponibilidad al cambiar de día/mes y al recibir un 409.
3. Antes de confirmar: `createBooking` → `verifySlot` en vivo antes de crear el hold.
4. Antes de crear el evento: `finalizeCalendar` → `verifySlot` en vivo excluyendo el propio hold.

## ADR-005 · Reservas temporales (holds)
- Gratuitas: hold `PENDING` de `holdMinutes` (10 min por defecto) que dura solo lo que tarda la creación del evento.
- Asesoría: hold `PAYMENT_PENDING` de `paymentHoldMinutes` (≥ 30 min, mínimo exigido por `expires_at` de Stripe Checkout). La sesión de Stripe expira en el mismo instante.
- Los holds vencidos se liberan con un margen de 2 min (webhooks tardíos) al crear reservas y vía cron.

## ADR-006 · Confirmación de pagos
- Solo `checkout.session.completed` con `payment_status = paid` (o `async_payment_succeeded`) confirma un pago; se valida monto y moneda contra el registro `Payment`.
- Tras el pago: hold sin expiración → evento en Google → `CONFIRMED`.
- Si el horario se perdió (hold vencido y tomado, o apareció un evento externo durante el pago): **reembolso automático** y `CANCELLED` con motivo visible.
- Si Google falla tras el pago: la reserva queda `PENDING` (pagada, horario retenido) y el cron reintenta con id de evento determinista (idempotente). El panel muestra alerta.

## ADR-007 · Microsoft solo lectura
- Bloquean: `busy`, `oof`, `tentative`. No bloquean: `free`, `workingElsewhere`. Eventos de día completo se interpretan en la zona horaria del horario (America/Lima).
- Nunca se crean eventos en Microsoft (evita duplicados).

## ADR-008 · Autenticación del panel propia (sin proveedor externo)
- **Contexto:** un único administrador (o pocos); minimizar dependencias y superficie.
- **Decisión:** email + contraseña (bcrypt coste 12), sesión en BD (token de 256 bits, se guarda solo su SHA-256), cookie `httpOnly`, `SameSite=Lax`, 12 h. Alta inicial protegida por `SETUP_TOKEN`. Login con rate limit.
- **Consecuencias:** se puede añadir 2FA/TOTP o SSO más adelante sin cambiar el modelo de reservas.

## ADR-009 · Formularios declarativos
- `meeting_types.formFields` (JSON validado por zod) define los campos; la UI y el backend usan la misma definición.
- Nuevo tipo de reunión = nueva fila (seed o panel), sin código.

## ADR-010 · Rate limiting en PostgreSQL
- Ventana fija con un único `INSERT … ON CONFLICT` atómico; funciona con varias instancias sin Redis. Si en el futuro hay mucho tráfico, sustituir por Redis/Upstash manteniendo la interfaz `enforceRateLimit`.

## ADR-011 · Confirmación al participante vía Google Calendar
- El participante se añade como invitado (`sendUpdates=all`), por lo que Google le envía la invitación con el enlace de Google Meet (si `addVideoConference` está activo). No se integra un proveedor de email propio en esta versión; queda como extensión (interfaz de notificaciones).

## ADR-012 · Calendarios simulados en desarrollo
- `DEV_FAKE_CALENDARS=true` permite probar todo el flujo sin credenciales; la app rechaza arrancar con esta opción en producción.

## ADR-013 · Identidad visual Revoredo IusCorp con lenguaje iOS
- **Contexto:** la titular pidió un diseño tipo iOS, con transiciones fluidas, y con la identidad de Revoredo IusCorp en lugar de la de IUS DARE.
- **Decisión:** paleta oficial (marino `#102438`, guinda `#621410`, gris `#E2E2E2`, blanco); titulares en serif editorial (Playfair Display) alternando romana y cursiva; texto en Inter. Patrones iOS: barra translúcida, listas agrupadas, controles en forma de píldora, barra de progreso segmentada, transiciones push/sheet con `cubic-bezier(.32,.72,0,1)` y respuesta táctil. El token `gold` se conserva por compatibilidad, pero ahora apunta al guinda.
- **Consecuencias:** el panel admin hereda los tokens. Si la marca entrega su serif oficial o la tipografía Aftika, basta con cambiarla en `src/app/layout.tsx`.

## ADR-014 · Cloudflare Workers como opción de hosting
- **Contexto:** se evalúa Cloudflare como alternativa temprana a Vercel.
- **Decisión:** OpenNext (`@opennextjs/cloudflare`) + Hyperdrive hacia PostgreSQL. Prisma pasa a `engineType = "client"`
  con `@prisma/adapter-pg`, y en Workers se crea un cliente por petición. D1 descartado (no soporta `EXCLUDE`).
  Cron Trigger en `cloudflare/worker.ts`. Docker sigue disponible (`BUILD_TARGET=docker`).
- **Consecuencias:** un único código para Node/Docker/Vercel/Cloudflare. Validado en `workerd` local (ver `docs/CLOUDFLARE.md`).
