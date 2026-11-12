/**
 * Punto de entrada en Cloudflare Workers.
 * - fetch: la app Next.js compilada por OpenNext.
 * - scheduled: Cron Trigger (wrangler.jsonc) → ejecuta /api/cron/maintenance con CRON_SECRET.
 */
// @ts-expect-error — generado por `opennextjs-cloudflare build`
import handler from "../.open-next/worker.js";

interface Env {
  APP_URL?: string;
  CRON_SECRET?: string;
}

export default {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const base = (env.APP_URL ?? "http://localhost").replace(/\/$/, "");
    const req = new Request(`${base}/api/cron/maintenance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    ctx.waitUntil(
      handler.fetch(req, env, ctx).then(async (res: Response) => {
        if (!res.ok) console.error(JSON.stringify({ level: "error", msg: "cron_maintenance_failed", status: res.status }));
      }),
    );
  },
};
