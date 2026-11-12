# Arquitectura técnica — Smart Booking

## 1. Vista general

```
                    ┌──────────────────────── Navegador ────────────────────────┐
                    │  /booking/vocare-iuris   /booking/cafecito-virtual          │
                    │  /booking/asesoria       /booking/status/:id   /admin/*     │
                    └───────────────┬───────────────────────────────┬────────────┘
                                    │ JSON (sin secretos)            │ Server Actions (cookie admin)
┌───────────────────────────────────▼───────────────────────────────▼────────────────────────┐
│ Next.js (Node)                                                                               │
│  API routes:  /api/availability  /api/bookings  /api/bookings/:id                            │
│               /api/oauth/{google|microsoft}/{start|callback}                                 │
│               /api/webhooks/stripe   /api/cron/maintenance   /api/health                     │
│                                                                                               │
│  src/server/                                                                                  │
│   ├─ availability/engine.ts   ← función pura computeSlots()                                  │
│   ├─ availability/service.ts  ← collectBusy(): Google ∪ Microsoft ∪ reservas propias (vivo)  │
│   ├─ calendars/               ← google.ts · microsoft.ts · tokens.ts (cifrado+refresh) · oauth│
│   ├─ bookings/service.ts      ← máquina de estados de reservas                                │
│   ├─ payments/                ← Stripe Checkout + webhook idempotente                         │
│   ├─ auth/ · security/        ← sesiones admin, AES-GCM, HMAC, rate limit                     │
│   └─ admin/                   ← consultas/mutaciones del panel                                │
└───────┬───────────────────────────────┬───────────────────────────────┬──────────────────────┘
        │ Prisma                         │ HTTPS (fetch, timeout 10 s)   │ Stripe SDK
┌───────▼────────┐      ┌────────────────▼──────────┐   ┌────────────────▼────────┐
│ PostgreSQL      │      │ Google Calendar API v3     │   │ Stripe Checkout          │
│ EXCLUDE gist    │      │ Microsoft Graph v1.0       │   │ Webhooks firmados        │
└─────────────────┘      └───────────────────────────┘   └──────────────────────────┘
```

## 2. Motor de disponibilidad

```
slots(tipo) = alinear( ventanas(fecha) , duración, intervalo )
              − ocupados_expandidos(buffers)
              ∩ [ahora + aviso mínimo , ahora + horizonte]

ventanas(fecha) = CUSTOM_HOURS(fecha) ?? reglas_semanales(díaSemana)  −  BLOCKED(fecha)
ocupados        = freeBusy(Google) ∪ calendarView(Microsoft: busy|oof|tentative) ∪ reservas activas
```

- Las reglas se expresan en minutos locales de `America/Lima` y se convierten a UTC con Luxon para cada fecha
  concreta → los eventos de calendarios en otras zonas (con o sin horario de verano) se comparan correctamente,
  porque todo se compara en UTC.
- El participante elige su zona horaria; la UI solo **presenta** los mismos instantes UTC en esa zona.
- `computeSlots` es pura y está cubierta por tests (`tests/unit/engine*.test.ts`).

## 3. Ciclo de vida de una reserva

```
                   createBooking (verificación en vivo #3 + INSERT protegido por EXCLUDE)
                                   │
              ┌────────────────────┴─────────────────────┐
         gratuita                                     asesoría
       PENDING (hold 10 min)                   PAYMENT_PENDING (hold ≥30 min)
              │ verificación #4 + evento Google        │ Stripe Checkout
     ┌────────┴────────┐                    ┌──────────┼──────────────┐
  CONFIRMED          FAILED            completed    expired       (abandono)
                (Google falló o          │            │              │ cron
                 conflicto: horario   PENDING      EXPIRED        EXPIRED
                 liberado)             (pagada)
                                         │ verificación #4 + evento Google
                              ┌──────────┼───────────────┐
                          CONFIRMED   conflicto      Google falla
                                      → reembolso    → sigue PENDING
                                      → CANCELLED    → cron reintenta

  Panel: CONFIRMED → CANCELLED (borra evento, reembolso opcional)
         CONFIRMED → RESCHEDULED (+ nueva reserva CONFIRMED vinculada; evento movido)
```

Estados activos (ocupan horario): `PENDING`, `PAYMENT_PENDING`, `CONFIRMED`.

## 4. Concurrencia

| Riesgo | Mitigación |
|---|---|
| Dos personas reservan el mismo horario a la vez | Constraint `bookings_no_overlap` (EXCLUDE gist). Exactamente un INSERT gana; el resto → 409. |
| Horarios solapados de distinta duración (45 vs 30 min) | El constraint compara rangos, no inicios. |
| Evento externo creado entre consulta y reserva | Verificación en vivo #3 y #4. |
| Webhook de Stripe duplicado / reintentado | Tabla `stripe_events` (PK = event.id). |
| Reintento de creación del evento en Google | Id de evento determinista `sb<uuid>` → 409 = ya existe. |
| Hold vencido mientras se crea el evento | `updateMany … WHERE status = PENDING`; si no actualiza, se borra el evento creado. |
| Varias instancias renovando tokens | Deduplicación en proceso + tokens Google no rotan; Microsoft devuelve un refresh token nuevo que se guarda. |

## 5. Modelo de datos (resumen)

| Tabla | Propósito |
|---|---|
| `admin_users`, `admin_sessions` | Administradores y sesiones (hash del token) |
| `app_settings` | Configuración global (zona horaria, duración de holds, onboarding) |
| `calendar_integrations` | Google / Microsoft: tokens cifrados, estado, calendarios consultados |
| `meeting_types` | Tipos de reunión: duración, intervalos, buffers, precio, formulario (JSON) |
| `availability_rules` | Disponibilidad semanal (minutos locales) |
| `availability_exceptions` | Bloqueos y horarios personalizados por fecha |
| `participants` | Personas que agendan |
| `bookings` | Reservas (estado, rango, hold, evento Google, reprogramación) |
| `form_responses` | Respuestas del formulario por reserva |
| `payments`, `stripe_events` | Pagos Stripe e idempotencia de webhooks |
| `sync_logs` | Registro de llamadas a Google/Microsoft (sin datos personales) |
| `audit_logs` | Acciones administrativas |
| `rate_limit_buckets` | Rate limiting distribuido |

Esquema completo: `prisma/schema.prisma`. Migraciones: `prisma/migrations/`.

## 6. Seguridad y privacidad

- Secretos solo en el servidor (`src/server/env.ts` valida con zod). Ningún `NEXT_PUBLIC_*`.
- Tokens OAuth cifrados con AES-256-GCM; `state` OAuth firmado con HMAC + nonce en cookie cifrada; PKCE (Microsoft).
- Webhooks Stripe verificados con firma sobre el raw body.
- Validación zod en todos los endpoints; formularios declarativos con lista blanca de claves (`.strict()`).
- Rate limiting en availability, creación de reservas, estado de reservas, login, setup y OAuth.
- Cabeceras de seguridad (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy).
- Logs JSON con redacción automática de email, teléfono, tokens, etc. Las IPs se guardan como HMAC.
- La página de estado de una reserva exige un token propio (no se pueden enumerar reservas por id).
- Panel: sesiones httpOnly/SameSite=Lax; mutaciones vía Server Actions (verificación de origen de Next.js); auditoría.

## 7. Extensibilidad

- **Nuevo tipo de reunión:** fila en `meeting_types` (o añadirlo a `src/lib/meeting-type-defaults.ts` y ejecutar el seed). Su URL será `/booking/<slug>`.
- **Nuevo campo de formulario:** añadir un `FormField` al JSON; tipos soportados: text, email, tel, textarea, select, multiselect (con opción personalizada).
- **Nuevo calendario de consulta (p. ej. iCloud/CalDAV):** implementar `BusySource` y registrarlo en `calendars/registry.ts`.
- **Notificaciones (email/WhatsApp):** engancharlas tras `booking_confirmed` en `finalizeCalendar`.
- **Otro proveedor de pago:** implementar el equivalente de `payments/` respetando `handlePaymentSucceeded`.
