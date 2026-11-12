# Configuración de credenciales

Guía paso a paso para Google, Microsoft y Stripe. En todos los casos los valores van **solo** en variables de
entorno del servidor (`.env` local o el panel de tu proveedor de hosting). Nunca en el código ni en el navegador.

> En los ejemplos, `APP_URL` es la URL pública de tu app, p. ej. `https://agenda.tudominio.com`
> (en local: `http://localhost:3000`).

---

## Google

Google Calendar es el **calendario principal**: se consulta su disponibilidad y ahí se crean todas las reservas.

### 1. Proyecto y API
1. Entra a <https://console.cloud.google.com/> y crea un proyecto (p. ej. `smart-booking`).
2. **APIs y servicios → Biblioteca** → habilita **Google Calendar API**.

### 2. Pantalla de consentimiento OAuth
1. **APIs y servicios → Pantalla de consentimiento de OAuth** (Google Auth Platform → *Branding / Audience / Data access*).
2. Tipo de usuario:
   - **Interno** si tu cuenta es de Google Workspace (recomendado: sin verificación ni caducidad de tokens).
   - **Externo** si es una cuenta @gmail.com.
3. Ámbitos (*Data access*): añade
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.freebusy`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `openid`, `email`
4. **Importante (tipo Externo):** mientras la app esté en estado *Testing*, Google **caduca el refresh token a los 7 días**
   y tendrías que reconectar cada semana. Pulsa **Publicar app** (*In production*). Como solo tú conectarás tu
   cuenta, no necesitas pasar la verificación: Google mostrará el aviso "app no verificada" una vez; continúa con
   *Configuración avanzada → Ir a smart-booking*.

### 3. Credenciales
1. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
2. Tipo: **Aplicación web**.
3. **URI de redireccionamiento autorizados:** `APP_URL/api/oauth/google/callback`
   (añade también `http://localhost:3000/api/oauth/google/callback` para desarrollo).
4. Copia los valores a:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

### 4. Conectar
Panel → **Integraciones → Conectar Google Calendar**. Autoriza con la cuenta cuyo calendario recibirá las reservas.
Después puedes elegir el calendario destino y qué calendarios adicionales consultar como "ocupado".

---

## Microsoft

Microsoft Calendar (Outlook / Microsoft 365) se usa **solo para leer** horarios ocupados.

### 1. Registro de la aplicación
1. Entra a <https://entra.microsoft.com/> → **Identidad → Aplicaciones → Registros de aplicaciones → Nuevo registro**.
2. Nombre: `smart-booking`.
3. **Tipos de cuenta admitidos:**
   - Cuenta personal (outlook.com / hotmail): *Cuentas en cualquier directorio organizativo y cuentas personales de Microsoft* → `MICROSOFT_TENANT_ID=common`.
   - Solo tu organización Microsoft 365: *Solo cuentas de este directorio* → `MICROSOFT_TENANT_ID=<ID del directorio (tenant)>`.
4. **URI de redirección:** plataforma **Web** → `APP_URL/api/oauth/microsoft/callback`
   (y `http://localhost:3000/api/oauth/microsoft/callback` para desarrollo).

### 2. Secreto
**Certificados y secretos → Nuevo secreto de cliente.** Copia el **Valor** (no el ID) inmediatamente.
> Los secretos caducan (máx. 24 meses). Anota la fecha: al caducar, la integración pasará a "Error" en el panel y
> deberás generar uno nuevo y actualizar la variable.

### 3. Permisos de API
**Permisos de API → Agregar permiso → Microsoft Graph → Permisos delegados:**
`Calendars.Read`, `User.Read`, `offline_access`, `openid`, `email`.
(En un tenant corporativo puede requerirse *Conceder consentimiento de administrador*.)

### 4. Variables
```
MICROSOFT_CLIENT_ID=<Id. de aplicación (cliente)>
MICROSOFT_CLIENT_SECRET=<valor del secreto>
MICROSOFT_TENANT_ID=common
```

### 5. Conectar
Panel → **Integraciones → Conectar Microsoft Calendar**.

---

## Stripe

> **Antes de empezar:** verifica que tu cuenta de Stripe pueda operar desde el país donde está registrada tu
> empresa (<https://stripe.com/global>). Stripe no admite cuentas en todos los países; en la fecha de esta guía
> Perú no figuraba en la lista, por lo que podrías necesitar una entidad en un país soportado. La moneda de cobro
> (PEN, USD, …) se elige en el onboarding.

### 1. Claves
1. <https://dashboard.stripe.com/> → **Desarrolladores → Claves de API**.
2. Copia la **clave secreta** (`sk_test_…` en modo prueba, `sk_live_…` en producción):
   ```
   STRIPE_SECRET_KEY=sk_live_...
   ```
   (Se recomienda una *clave restringida* con permisos de escritura en *Checkout Sessions* y *Refunds*.)

### 2. Webhook
1. **Desarrolladores → Webhooks → Añadir endpoint**.
2. URL: `APP_URL/api/webhooks/stripe`
3. Eventos:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `charge.refunded`
4. Copia el **secreto de firma** (`whsec_…`):
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 3. Desarrollo local
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# usa el whsec_… que imprime como STRIPE_WEBHOOK_SECRET
```
Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura y CVC.

### 4. Precio
El precio **no** está en el código: se configura en el onboarding (`/admin/setup`) o en **Configuración** del panel.
Mientras no exista precio, la página `/booking/asesoria` muestra que aún no está disponible.

---

## Resumen de URLs a registrar

| Proveedor | URL |
|---|---|
| Google (redirect) | `APP_URL/api/oauth/google/callback` |
| Microsoft (redirect) | `APP_URL/api/oauth/microsoft/callback` |
| Stripe (webhook) | `APP_URL/api/webhooks/stripe` |
