# Despliegue

## Requisitos
- Node.js ≥ 20.11
- PostgreSQL ≥ 14 (gestionado: Neon, Supabase, Render, RDS, Cloud SQL… o propio). El constraint anti-solapamiento usa
  índices GiST sobre `tstzrange`, incluidos en PostgreSQL estándar.
- HTTPS obligatorio en producción (OAuth y cookies `Secure`).

## Pasos comunes
1. Crear la base de datos y fijar `DATABASE_URL` (con `?sslmode=require` si es remota).
2. Fijar todas las variables de `.env.example` (`NODE_ENV=production` lo pone el hosting).
3. Aplicar migraciones y seed (idempotente):
   ```bash
   npm ci
   npx prisma migrate deploy
   npm run db:seed
   ```
4. Compilar y arrancar: `npm run build && npm start` (o la imagen Docker).
5. Configurar la tarea periódica (cada 5–10 min):
   ```bash
   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/maintenance"
   ```
   Expira reservas temporales, reintenta eventos de Google de reservas pagadas y limpia datos efímeros.
   (Los holds también se liberan en cada nueva reserva, así que el cron es una red de seguridad.)
6. Abrir `APP_URL/admin/setup`, introducir `SETUP_TOKEN`, crear la cuenta, configurar el precio de la asesoría
   y conectar Google y Microsoft.
7. Registrar el webhook de Stripe (`APP_URL/api/webhooks/stripe`).
8. Comprobar `APP_URL/api/health` → `{"status":"ok"}`.

## Opción A — Vercel + Postgres gestionado
- Root directory del proyecto: `smart-booking`.
- Build command: `npx prisma migrate deploy && npm run build`.
- Cron: Vercel Cron envía automáticamente `Authorization: Bearer $CRON_SECRET` si la variable existe. Crea
  `vercel.json` con `{"crons":[{"path":"/api/cron/maintenance","schedule":"*/10 * * * *"}]}`
  (el plan Hobby solo permite una ejecución diaria; en ese caso usa un cron externo como cron-job.org).
- `TRUST_PROXY=true`.

## Opción B — Docker (Render, Railway, Fly.io, VPS)
```bash
docker build -t smart-booking .
docker run --env-file .env -p 3000:3000 smart-booking
```
La imagen ejecuta `prisma migrate deploy` al arrancar. `docker-compose.yml` levanta app + PostgreSQL para pruebas locales.

## Operación
- **Logs:** JSON por stdout (sin datos personales). Eventos clave: `booking_hold_created`, `booking_confirmed`,
  `calendar_event_create_failed`, `stripe_payment_processed`, `payment_refunded`, `oauth_token_refreshed`.
- **Alertas recomendadas:** `level=error`; integración en estado `ERROR` (visible en el panel);
  reservas `PENDING` pagadas (banner en el panel).
- **Rotación de `ENCRYPTION_KEY`:** invalida los tokens guardados → reconectar Google y Microsoft.
- **Backups:** activar backups automáticos de PostgreSQL (contiene datos personales: cifrar en reposo).
- **Retención:** define un plazo para borrar participantes/respuestas antiguos según tu política de privacidad
  (Ley N.º 29733 de Protección de Datos Personales del Perú).
