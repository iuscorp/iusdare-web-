# Smart Booking — Sistema inteligente de agendamiento

Aplicación de reservas con **tres enlaces públicos independientes**, una **disponibilidad consolidada**
(Google Calendar + Microsoft Calendar + horario semanal) y **Google Calendar como agenda única de destino**.

| Modalidad | URL | Duración | Pago |
|---|---|---|---|
| Entrevista – Vocare Iuris | `/booking/vocare-iuris` | 30 min | — |
| Cafecito virtual \| Reunión de sinergias | `/booking/cafecito-virtual` | 30 min | — |
| Asesoría profesional | `/booking/asesoria` | 45 min | Stripe Checkout |

Panel privado: `/admin` (reservas, KPIs, disponibilidad, excepciones, precio, integraciones, pagos).

## Características
- Motor de disponibilidad en vivo: horario semanal (America/Lima) ± excepciones − ocupados de Google y Microsoft − reservas activas.
- Prevención de dobles reservas garantizada por PostgreSQL (`EXCLUDE USING gist`), probada con solicitudes concurrentes.
- Re-verificación en vivo antes de reservar y antes de crear el evento en Google.
- Reservas temporales con expiración automática durante el pago; confirmación solo vía webhook firmado de Stripe.
- Eventos en Google con título `"<Tipo> | <Nombre>"`, descripción con todos los datos, invitación al participante y Google Meet.
- OAuth 2.0 (Google y Microsoft) con tokens cifrados (AES-256-GCM) y renovación automática.
- Formularios declarativos por tipo de reunión (multiselección con opción personalizada, textareas guiados).
- Selector de zona horaria, mobile-first, accesible.
- Rate limiting, validación zod, cabeceras de seguridad, logs sin datos personales, auditoría de acciones admin.

## Stack
Next.js 15 · React 19 · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Luxon · zod · Stripe · Google Calendar API · Microsoft Graph · Vitest.
Justificación en [`docs/DECISIONS.md`](docs/DECISIONS.md) y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Instalación local

```bash
cd smart-booking
cp .env.example .env            # completa los valores (ver abajo)
npm install
npx prisma migrate deploy       # o: npm run db:migrate (desarrollo)
npm run db:seed                 # tipos de reunión + disponibilidad inicial
npm run dev                     # http://localhost:3000
```

Valores mínimos para arrancar en local **sin credenciales externas**:

```bash
DATABASE_URL="postgresql://smartbooking:smartbooking@localhost:5432/smartbooking"
APP_URL="http://localhost:3000"
ENCRYPTION_KEY="$(openssl rand -base64 32)"
AUTH_SECRET="$(openssl rand -base64 48)"
SETUP_TOKEN="$(openssl rand -hex 24)"
CRON_SECRET="$(openssl rand -hex 24)"
DEV_FAKE_CALENDARS="true"       # calendarios simulados (solo desarrollo)
```

Con `DEV_FAKE_CALENDARS=true` el flujo completo funciona con ocupados simulados (L–V 13:00–14:00 "Google",
martes y jueves 15:00–16:30 "Microsoft"). Para pagos en local usa claves de prueba de Stripe y `stripe listen`.

¿Sin PostgreSQL local? `docker compose up db` levanta uno.

### Onboarding
1. Abre `/admin/setup`, introduce el `SETUP_TOKEN`, crea tu cuenta de administradora.
2. Define el precio y la moneda de la **Asesoría profesional** (no hay precio por defecto).
3. Conecta **Google Calendar** (obligatorio: sin él no se ofrecen horarios) y **Microsoft Calendar**.
4. Comparte los tres enlaces.

## Credenciales externas
Guía detallada: [`docs/CREDENTIALS.md`](docs/CREDENTIALS.md) (Google Cloud, Microsoft Entra, Stripe).

## Tests

```bash
# requiere una BD de pruebas vacía (se reinicia en cada ejecución)
export TEST_DATABASE_URL="postgresql://smartbooking:smartbooking@localhost:5432/smartbooking_test"
npm test                 # unit + integración
npm run test:unit
npm run test:integration
npm run typecheck && npm run lint
```

La suite cubre el motor de disponibilidad (zonas horarias, DST, buffers, excepciones), formularios, cifrado,
adaptadores Google/Microsoft (con `fetch` simulado), concurrencia real contra PostgreSQL, flujos de pago y webhooks.

## Despliegue
Ver [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (Vercel + Postgres gestionado, o Docker). Incluye la tarea
periódica `/api/cron/maintenance`.

## Estructura
```
smart-booking/
├─ AGENTS.md            instrucciones para agentes/colaboradores
├─ docs/                arquitectura, decisiones, credenciales, despliegue
├─ prisma/              esquema, migraciones (incluye constraint anti-solapamiento), seed
├─ src/app/             páginas públicas, panel /admin y API routes
├─ src/components/      UI (booking, admin, ui)
├─ src/lib/             código isomórfico (formularios, formato)
├─ src/server/          dominio: availability, calendars, bookings, payments, auth, security, admin
└─ tests/               unit + integration
```

## API pública

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/availability?meetingType=&from=&to=` | Horarios disponibles (UTC ISO), calculados en vivo |
| POST | `/api/bookings` | Crea la reserva (gratuita) o devuelve `checkoutUrl` (asesoría) |
| GET | `/api/bookings/:id?token=` | Estado de la reserva para el participante |
| POST | `/api/webhooks/stripe` | Webhook de Stripe (firma verificada) |
| GET | `/api/oauth/{google,microsoft}/start` | Inicia OAuth (solo admin) |
| POST | `/api/cron/maintenance` | Tareas periódicas (`Bearer CRON_SECRET`) |
| GET | `/api/health` | Estado de la app y la BD |
