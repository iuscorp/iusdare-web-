"use client";

import { DateTime } from "luxon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { tzLabel } from "./timezones";

interface PublicBooking {
  id: string;
  reference: string;
  status: "PENDING" | "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED" | "EXPIRED" | "FAILED";
  meetingType: { slug: string; name: string; durationMinutes: number };
  start: string;
  end: string;
  timezone: string;
  meetingUrl: string | null;
  expiresAt: string | null;
  cancelReason: string | null;
  rescheduledToId: string | null;
}

const POLL_MS = 2500;
const MAX_POLL_MS = 3 * 60_000;

export function BookingStatusView({
  id,
  token,
  paid,
  cancelled,
}: {
  id: string;
  token: string;
  paid: boolean;
  cancelled: boolean;
}) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    startedAt.current = Date.now();
    setTimedOut(false);

    async function tick() {
      try {
        const res = await fetch(`/api/bookings/${id}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (stop) return;
        if (res.status === 404 || res.status === 422) {
          setState("notfound");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const b = (await res.json()) as PublicBooking;
        setBooking(b);
        setState("ok");
        const waiting = b.status === "PENDING" || (b.status === "PAYMENT_PENDING" && !cancelled);
        if (!waiting) return;
        if (Date.now() - startedAt.current > MAX_POLL_MS) {
          setTimedOut(true);
          return;
        }
      } catch {
        if (stop) return;
        setState((s) => (s === "ok" ? s : "error"));
      }
      timer = setTimeout(tick, POLL_MS);
    }
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, token, cancelled]);

  if (state === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-10 text-center" role="status">
          <Spinner className="h-8 w-8 text-navy" />
          <p className="text-sm text-navy-deep/70">Cargando tu reserva…</p>
        </div>
      </Shell>
    );
  }
  if (state === "notfound") {
    return (
      <Shell>
        <StatusHeader tone="neutral" title="No encontramos esta reserva" />
        <p className="mt-3 text-center text-sm text-navy-deep/70">
          El enlace puede estar incompleto o haber expirado. Revisa el enlace recibido o agenda una nueva reunión.
        </p>
        <Actions>
          <Link href="/" className={linkBtn}>
            Ver tipos de reunión
          </Link>
        </Actions>
      </Shell>
    );
  }
  if (state === "error" || !booking) {
    return (
      <Shell>
        <Alert tone="danger" title="No pudimos cargar tu reserva">
          Revisa tu conexión y recarga la página.
        </Alert>
      </Shell>
    );
  }

  const b = booking;
  const s = DateTime.fromISO(b.start, { zone: b.timezone }).setLocale("es");
  const e = DateTime.fromISO(b.end, { zone: b.timezone });
  const details = (
    <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper text-sm">
      <Row label="Reunión" value={b.meetingType.name} />
      <Row label="Fecha" value={<span className="inline-block first-letter:uppercase">{s.toFormat("cccc d 'de' LLLL 'de' yyyy")}</span>} />
      <Row label="Hora" value={`${s.toFormat("HH:mm")} – ${e.toFormat("HH:mm")} · ${tzLabel(b.timezone)}`} />
      <Row label="Duración" value={`${b.meetingType.durationMinutes} minutos`} />
      <Row label="Código" value={<span className="font-mono tracking-wider">{b.reference}</span>} />
    </dl>
  );
  const bookAgain = `/booking/${b.meetingType.slug}`;

  switch (b.status) {
    case "CONFIRMED":
      return (
        <Shell>
          <StatusHeader tone="success" title="¡Tu reunión está confirmada!" />
          <p className="mt-3 text-center text-sm text-navy-deep/70">
            Recibirás una invitación de Google Calendar en tu correo electrónico.
          </p>
          {details}
          {b.meetingUrl && (
            <Actions>
              <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className={linkBtnPrimary}>
                Enlace de la videollamada
              </a>
            </Actions>
          )}
        </Shell>
      );
    case "PAYMENT_PENDING":
      if (cancelled) {
        return (
          <Shell>
            <StatusHeader tone="warning" title="Pago cancelado" />
            <p className="mt-3 text-center text-sm text-navy-deep/70">
              No se realizó ningún cargo. Tu reserva temporal expirará automáticamente y el horario quedará libre.
            </p>
            {details}
            <Actions>
              <Link href={bookAgain} className={linkBtnPrimary}>
                Elegir otro horario
              </Link>
            </Actions>
          </Shell>
        );
      }
      return (
        <Shell>
          <StatusHeader tone="pending" title={paid ? "Confirmando tu pago…" : "Pago pendiente"} />
          <p className="mt-3 text-center text-sm text-navy-deep/70" aria-live="polite">
            {paid
              ? "Estamos recibiendo la confirmación de Stripe. Esto suele tardar unos segundos; no cierres esta página."
              : "Tu horario está reservado temporalmente mientras completas el pago."}
          </p>
          {timedOut && (
            <Alert tone="warning" className="mt-4">
              La confirmación está tardando más de lo habitual. Si ya pagaste, recibirás la invitación en tu correo en cuanto se procese.
            </Alert>
          )}
          {details}
        </Shell>
      );
    case "PENDING":
      return (
        <Shell>
          <StatusHeader tone="pending" title="Finalizando tu reserva…" />
          <p className="mt-3 text-center text-sm text-navy-deep/70" aria-live="polite">
            Estamos registrando tu reunión en el calendario. Recibirás la invitación en tu correo en cuanto se complete.
          </p>
          {timedOut && (
            <Alert tone="warning" className="mt-4">
              El registro está tardando más de lo habitual. Lo seguiremos intentando automáticamente; tu horario está asegurado.
            </Alert>
          )}
          {details}
        </Shell>
      );
    case "CANCELLED":
      return (
        <Shell>
          <StatusHeader tone="danger" title="Reserva cancelada" />
          {b.cancelReason && <p className="mt-3 text-center text-sm text-navy-deep/70">Motivo: {b.cancelReason}</p>}
          {details}
          <Actions>
            <Link href={bookAgain} className={linkBtnPrimary}>
              Agendar nuevamente
            </Link>
          </Actions>
        </Shell>
      );
    case "RESCHEDULED":
      return (
        <Shell>
          <StatusHeader tone="info" title="Esta reunión fue reprogramada" />
          <p className="mt-3 text-center text-sm text-navy-deep/70">Consulta el nuevo horario de tu reunión.</p>
          {b.rescheduledToId && (
            <Actions>
              <Link href={`/booking/status/${b.rescheduledToId}?token=${encodeURIComponent(token)}`} className={linkBtnPrimary}>
                Ver nuevo horario
              </Link>
            </Actions>
          )}
        </Shell>
      );
    case "EXPIRED":
      return (
        <Shell>
          <StatusHeader tone="neutral" title="La reserva temporal expiró" />
          <p className="mt-3 text-center text-sm text-navy-deep/70">
            No se completó el proceso a tiempo y el horario fue liberado.
          </p>
          <Actions>
            <Link href={bookAgain} className={linkBtnPrimary}>
              Elegir un nuevo horario
            </Link>
          </Actions>
        </Shell>
      );
    case "FAILED":
    default:
      return (
        <Shell>
          <StatusHeader tone="danger" title="No se pudo completar la reserva" />
          <p className="mt-3 text-center text-sm text-navy-deep/70">
            La reunión no quedó registrada. Por favor, inténtalo nuevamente.
          </p>
          <Actions>
            <Link href={bookAgain} className={linkBtnPrimary}>
              Intentar de nuevo
            </Link>
          </Actions>
        </Shell>
      );
  }
}

const linkBtn =
  "inline-flex h-11 items-center justify-center rounded-lg border border-navy-deep/25 px-5 font-display text-[15px] font-semibold text-navy-deep transition-colors hover:border-navy-deep hover:bg-navy-50";
const linkBtnPrimary =
  "inline-flex h-11 items-center justify-center rounded-lg bg-navy-deep px-5 font-display text-[15px] font-semibold text-white transition-colors hover:bg-navy";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg animate-fade-up rounded-3xl border border-line bg-white p-6 shadow-lift sm:p-10">
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="eyebrow text-[10px] text-navy-deep/55">{label}</dt>
      <dd className="font-medium text-navy-deep sm:text-right">{value}</dd>
    </div>
  );
}

function StatusHeader({ tone, title }: { tone: "success" | "pending" | "danger" | "warning" | "info" | "neutral"; title: string }) {
  const ring = {
    success: "bg-emerald-50 text-emerald-700",
    pending: "bg-gold-50 text-gold-dark",
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-sky-50 text-sky-700",
    neutral: "bg-navy-100 text-navy-deep/70",
  }[tone];
  return (
    <div className="flex flex-col items-center text-center">
      <span className={cn("flex h-14 w-14 items-center justify-center rounded-full", ring)} aria-hidden="true">
        {tone === "success" ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : tone === "pending" ? (
          <Spinner className="h-7 w-7" />
        ) : tone === "danger" || tone === "warning" ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7">
            <path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4l2.5 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-navy-deep" role="status">
        {title}
      </h1>
    </div>
  );
}
