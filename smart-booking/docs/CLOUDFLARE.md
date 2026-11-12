# Despliegue en Cloudflare (Workers + Hyperdrive)

Alternativa a Vercel **validada técnicamente**: la app se compiló con OpenNext y se ejecutó en `workerd`
(el runtime de Cloudflare) contra PostgreSQL. Ver "Resultados de la validación" al final.

## Arquitectura en Cloudflare

```
Navegador ──► Cloudflare Worker (Next.js vía OpenNext, nodejs_compat)
                 ├─ Hyperdrive ──► PostgreSQL gestionado (Neon / Supabase / RDS)
                 ├─ Cron Trigger (*/10 min) ──► /api/cron/maintenance
                 └─ fetch ──► Google Calendar · Microsoft Graph · Stripe
```

- **La base de datos sigue siendo PostgreSQL.** D1 (SQLite) **no sirve**: la prevención de dobles reservas depende
  del constraint `EXCLUDE USING gist` de PostgreSQL. Cloudflare se conecta a ella mediante **Hyperdrive**
  (pool de conexiones en el edge).
- Prisma usa el *driver adapter* `pg` (`engineType = "client"`, sin binarios nativos): el mismo código corre en Node y en Workers.
- En Workers se crea un cliente de BD **por petición** (`src/server/db.ts`): Workers no permite compartir una conexión
  entre peticiones; Hyperdrive mantiene el pool real.

## Pasos

1. **Base de datos:** crear un PostgreSQL gestionado (p. ej. Neon) y aplicar migraciones desde tu equipo/CI:
   ```bash
   DATABASE_URL="postgres://…" npx prisma migrate deploy && DATABASE_URL="postgres://…" npm run db:seed
   ```
2. **Hyperdrive:**
   ```bash
   npx wrangler login
   npx wrangler hyperdrive create smart-booking-db --connection-string="postgres://USER:PASS@HOST:5432/DB?sslmode=require"
   ```
   Copia el `id` devuelto en `wrangler.jsonc` → `hyperdrive[0].id`.
3. **Secretos** (nunca en `wrangler.jsonc` ni en el repositorio):
   ```bash
   for k in ENCRYPTION_KEY AUTH_SECRET SETUP_TOKEN CRON_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
            MICROSOFT_CLIENT_ID MICROSOFT_CLIENT_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
     npx wrangler secret put $k
   done
   ```
   Variables no secretas (`APP_URL`, `MICROSOFT_TENANT_ID`, `TRUST_PROXY=true`) en `vars` de `wrangler.jsonc` o como secretos.
   `DATABASE_URL` no es necesaria en producción (la aporta Hyperdrive).
4. **Compilar y desplegar** — **sin archivo `.env` en el directorio** (OpenNext incorpora los `.env` al bundle;
   compila en CI o mueve tu `.env` local antes):
   ```bash
   npm run cf:deploy
   ```
5. **Dominio:** Workers → *Settings → Domains & Routes* → añadir `agenda.tudominio.com` (el DNS debe estar en Cloudflare).
6. Registrar las URLs de retorno OAuth y el webhook de Stripe con ese dominio (ver `CREDENTIALS.md`).
7. Abrir `/admin/setup`.

Prueba local en el runtime de Cloudflare: `npm run cf:preview` (usa `.dev.vars` y `localConnectionString`).
Probar el cron en local: `npx wrangler dev --test-scheduled` y `curl "localhost:8787/__scheduled?cron=*/10+*+*+*+*"`.

## Resultados de la validación (local, `workerd` + PostgreSQL 16)

| Área | Resultado |
|---|---|
| Build OpenNext (Next 15.5) | ✅ |
| Páginas públicas, estado, 404 | ✅ 200 |
| `/api/health`, BD vía driver adapter | ✅ |
| Disponibilidad sin Google conectado | ✅ 503 `CALENDAR_UNAVAILABLE` (falla cerrado) |
| Validación de reservas (zod) | ✅ 422 con detalle por campo |
| Onboarding admin (bcrypt, sesión, Server Actions, advisory lock) y las 6 vistas del panel | ✅ |
| OAuth start (AES-256-GCM, HMAC del `state`, cookie httpOnly) y rechazo de `state` manipulado | ✅ |
| Cron Trigger → mantenimiento | ✅ |
| Tamaño del Worker | 9,8 MB sin comprimir / **2,3 MB gzip** (límite gratuito 3 MB, pago 10 MB) |
| Suite de pruebas en Node con el nuevo cliente de BD | ✅ 116/116 |

**No validado aún (requiere cuenta y credenciales reales):** conexión real por Hyperdrive, llamadas reales a
Google/Microsoft/Stripe desde Workers, y carga con tráfico concurrente en producción.

## Riesgos y consideraciones
- Si el bundle supera 3 MB comprimido en el futuro, se necesita el plan Workers de pago (5 USD/mes aprox.).
- CPU por petición: el plan gratuito limita el tiempo de CPU; bcrypt (coste 12) en el login puede acercarse al
  límite. Recomendado el plan de pago para producción.
- Los logs se ven en *Workers → Observability* (habilitado en `wrangler.jsonc`).
