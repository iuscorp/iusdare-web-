"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Card";
import { Button, Spinner } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { buildAnswersSchema, CORE_FIELDS, type MultiValue } from "@/lib/forms/schema";
import type { PublicMeetingType } from "@/server/public/meeting-types";
import { DynamicForm, initialAnswers, type AnswerValue, type Answers } from "./DynamicForm";
import { MonthCalendar } from "./MonthCalendar";
import { StepIndicator } from "./StepIndicator";
import { TimezoneSelect } from "./TimezoneSelect";
import { detectTimezone, tzLabel } from "./timezones";

interface Slot {
  start: string;
  end: string;
}
type Step = "date" | "time" | "form" | "redirect";
interface ApiError {
  error?: { code?: string; message?: string; details?: unknown };
}

export function BookingFlow({ meeting }: { meeting: PublicMeetingType }) {
  const router = useRouter();
  const allFields = useMemo(() => [...CORE_FIELDS, ...meeting.formFields], [meeting.formFields]);
  const answersSchema = useMemo(() => buildAnswersSchema(meeting.formFields), [meeting.formFields]);

  const [detected, setDetected] = useState(meeting.scheduleTimezone);
  const [timezone, setTimezone] = useState(meeting.scheduleTimezone);
  const [month, setMonth] = useState(() => DateTime.now().setZone(meeting.scheduleTimezone).startOf("month"));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState<Step>("date");
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers(allFields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestId = useRef(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  // Detectar zona del navegador tras montar (evita desajustes de hidratación)
  useEffect(() => {
    const tz = detectTimezone(meeting.scheduleTimezone);
    setDetected(tz);
    setTimezone(tz);
    setMonth(DateTime.now().setZone(tz).startOf("month"));
  }, [meeting.scheduleTimezone]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    const now = DateTime.now();
    const from = DateTime.max(month.startOf("month"), now);
    const to = month.endOf("month");
    if (to <= from) {
      setSlots([]);
      setLoading(false);
      return;
    }
    try {
      const qs = new URLSearchParams({
        meetingType: meeting.slug,
        from: from.toUTC().toISO()!,
        to: to.toUTC().toISO()!,
      });
      const res = await fetch(`/api/availability?${qs}`, { cache: "no-store" });
      const json = (await res.json()) as { slots?: Slot[] } & ApiError;
      if (id !== requestId.current) return;
      if (!res.ok) {
        setSlots([]);
        setLoadError(json.error?.message ?? "No pudimos cargar la disponibilidad.");
      } else {
        setSlots(json.slots ?? []);
      }
    } catch {
      if (id === requestId.current) setLoadError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [meeting.slug, month]);

  useEffect(() => {
    void load();
  }, [load]);

  // Agrupar por fecha en la zona elegida
  const byDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = DateTime.fromISO(s.start, { zone: timezone }).toISODate()!;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [slots, timezone]);
  const counts = useMemo(() => new Map([...byDate].map(([k, v]) => [k, v.length])), [byDate]);
  const daySlots = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  // Si la fecha seleccionada pierde sus horarios (refresco), volver al calendario
  useEffect(() => {
    if (loading || !selectedDate) return;
    if (!byDate.has(selectedDate)) {
      setSelectedDate(null);
      setSelectedSlot(null);
      if (step === "time") setStep("date");
    } else if (selectedSlot && !byDate.get(selectedDate)!.some((s) => s.start === selectedSlot.start)) {
      setSelectedSlot(null);
      if (step === "form") setStep("time");
    }
  }, [byDate, loading, selectedDate, selectedSlot, step]);

  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: false });
  }, [step]);

  const thisMonth = DateTime.now().setZone(timezone).startOf("month");
  const maxMonth = thisMonth.plus({ months: 3 });
  const canPrev = month > thisMonth;
  const canNext = month < maxMonth;

  function changeTimezone(tz: string) {
    setTimezone(tz);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep("date");
    setMonth((m) => DateTime.fromObject({ year: m.year, month: m.month, day: 1 }, { zone: tz }));
  }

  function pickDate(iso: string) {
    setSelectedDate(iso);
    setSelectedSlot(null);
    setNotice(null);
    setStep("time");
  }

  function pickSlot(s: Slot) {
    setSelectedSlot(s);
    setSubmitError(null);
    setStep("form");
  }

  function setAnswer(key: string, v: AnswerValue) {
    setAnswers((a) => ({ ...a, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function normalizedAnswers(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v === "object") {
        const mv = v as MultiValue;
        out[k] = mv.custom && mv.custom.trim() ? { selected: mv.selected, custom: mv.custom.trim() } : { selected: mv.selected };
      } else out[k] = v;
    }
    return out;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitError(null);
    const payload = normalizedAnswers();
    const parsed = answersSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      const first = allFields.find((f) => errs[f.key]);
      if (first) document.getElementById(`f-${first.key}`)?.focus();
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingType: meeting.slug, start: selectedSlot.start, timezone, answers: payload }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiError & {
        bookingId?: string;
        accessToken?: string;
        checkoutUrl?: string;
      };
      if (res.ok && json.bookingId) {
        if (json.checkoutUrl) {
          setStep("redirect");
          window.location.assign(json.checkoutUrl);
          return;
        }
        router.push(`/booking/status/${json.bookingId}?token=${encodeURIComponent(json.accessToken ?? "")}`);
        return;
      }
      const code = json.error?.code;
      if (code === "SLOT_UNAVAILABLE") {
        setNotice(json.error?.message ?? "Ese horario ya no está disponible. Elige otro.");
        setSelectedSlot(null);
        setStep(selectedDate ? "time" : "date");
        await load();
      } else if (code === "VALIDATION_ERROR" && Array.isArray(json.error?.details)) {
        const errs: Record<string, string> = {};
        for (const d of json.error!.details as { path: string; message: string }[]) {
          const key = d.path.replace(/^answers\./, "").split(".")[0] ?? "";
          if (key && !errs[key]) errs[key] = d.message;
        }
        setErrors(errs);
        setSubmitError(json.error?.message ?? "Revisa los datos ingresados.");
      } else {
        setSubmitError(json.error?.message ?? "No pudimos completar la reserva. Inténtalo nuevamente.");
      }
    } catch {
      setSubmitError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = meeting.requiresPayment ? ["Fecha", "Horario", "Datos", "Pago", "Confirmación"] : ["Fecha", "Horario", "Datos", "Confirmación"];
  const stepIndex = step === "date" ? 0 : step === "time" ? 1 : step === "form" ? 2 : 3;
  const slotLabel = (s: Slot) => DateTime.fromISO(s.start, { zone: timezone }).toFormat("HH:mm");
  const selectedDateLabel = selectedDate
    ? DateTime.fromISO(selectedDate, { zone: timezone }).setLocale("es").toFormat("cccc d 'de' LLLL")
    : "";

  return (
    <div className="grid animate-sheet-in overflow-hidden rounded-[28px] bg-white shadow-lift lg:grid-cols-[minmax(300px,360px)_1fr]">
      {/* Panel informativo */}
      <aside className="relative overflow-hidden bg-navy-deep p-6 text-white sm:p-8">
        <span className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.04]" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-guinda/20 blur-3xl" aria-hidden="true" />
        <p className="eyebrow relative text-guinda-tint">Agenda una reunión</p>
        <h1 className="relative mt-3 text-[30px] leading-[1.08] sm:text-[34px]">{meeting.name}</h1>
        <span className="relative mt-4 block h-[3px] w-12 rounded-full bg-guinda-tint/80" aria-hidden="true" />
        <ul className="relative mt-5 space-y-2.5 text-[14px] text-white/80">
          <li className="flex items-center gap-2.5">
            <ClockIcon /> {meeting.durationMinutes} minutos
          </li>
          {meeting.videoConference && (
            <li className="flex items-center gap-2.5">
              <VideoIcon /> Videollamada (Google Meet)
            </li>
          )}
          {meeting.requiresPayment && meeting.priceLabel && (
            <li className="flex items-center gap-2.5">
              <CardIcon />
              <span>
                <span className="font-semibold text-white">{meeting.priceLabel}</span> · pago seguro con Stripe
              </span>
            </li>
          )}
        </ul>
        <p className="relative mt-5 text-[15px] leading-relaxed text-white/70">{meeting.description}</p>

        {selectedSlot && (
          <div className="relative mt-6 animate-pop rounded-2xl bg-white/[0.08] p-4 ring-1 ring-inset ring-white/15 backdrop-blur">
            <p className="eyebrow text-[10px] text-guinda-tint">Horario elegido</p>
            <p className="mt-1.5 font-display text-[18px] first-letter:uppercase">{selectedDateLabel}</p>
            <p className="text-sm text-white/80">
              {slotLabel(selectedSlot)} – {DateTime.fromISO(selectedSlot.end, { zone: timezone }).toFormat("HH:mm")} ·{" "}
              {tzLabel(timezone)}
            </p>
          </div>
        )}
      </aside>

      {/* Flujo */}
      <section className="min-w-0 p-5 sm:p-8">
        <StepIndicator steps={steps} current={stepIndex} />

        <div className="mt-6" aria-live="polite">
          {notice && (
            <Alert tone="warning" className="mb-5">
              {notice}
            </Alert>
          )}
        </div>

        {step === "redirect" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" role="status">
            <Spinner className="h-8 w-8 text-guinda" />
            <h2 ref={stepHeading} tabIndex={-1} className="text-[24px]">
              Redirigiendo a pago seguro…
            </h2>
            <p className="max-w-sm text-sm text-navy-deep/70">
              Tu horario queda reservado temporalmente mientras completas el pago en Stripe.
            </p>
          </div>
        ) : step === "form" && selectedSlot ? (
          <form key="form" onSubmit={submit} noValidate className="animate-push-in">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 ref={stepHeading} tabIndex={-1} className="text-[26px] leading-tight">
                Tus <em className="text-guinda">datos</em>
              </h2>
              <BackButton onClick={() => setStep("time")} disabled={submitting}>
                Horario
              </BackButton>
            </div>
            <DynamicForm fields={allFields} values={answers} errors={errors} onChange={setAnswer} disabled={submitting} />

            {submitError && (
              <Alert tone="danger" className="mt-5">
                {submitError}
              </Alert>
            )}

            <p className="mt-6 text-xs leading-relaxed text-navy-deep/60">
              Tus datos se usarán únicamente para gestionar esta reunión y no se compartirán con terceros. Recibirás la
              invitación en tu correo electrónico.
            </p>

            <Button type="submit" variant={meeting.requiresPayment ? "gold" : "primary"} size="lg" className="mt-4 w-full sm:w-auto" loading={submitting}>
              {submitting
                ? "Verificando disponibilidad…"
                : meeting.requiresPayment
                  ? `Continuar al pago${meeting.priceLabel ? ` · ${meeting.priceLabel}` : ""}`
                  : "Confirmar reserva"}
            </Button>
          </form>
        ) : (
          <div key={step} className="grid animate-push-in gap-8 md:grid-cols-[1fr_minmax(200px,240px)]">
            <div className={cn(step === "time" && "hidden md:block")}>
              <div className="mb-4 flex flex-col gap-3">
                <h2 ref={step === "date" ? stepHeading : undefined} tabIndex={-1} className="text-[26px] leading-tight">
                  Elige una <em className="text-guinda">fecha</em>
                </h2>
                <div className="sm:max-w-xs">
                  <TimezoneSelect value={timezone} detected={detected} onChange={changeTimezone} />
                </div>
              </div>
              <MonthCalendar
                month={month}
                timezone={timezone}
                availableDates={counts}
                selectedDate={selectedDate}
                loading={loading}
                canGoPrev={canPrev}
                canGoNext={canNext}
                onPrev={() => setMonth((m) => m.minus({ months: 1 }))}
                onNext={() => setMonth((m) => m.plus({ months: 1 }))}
                onSelect={pickDate}
              />
              <div className="mt-3" aria-live="polite">
                {loading && (
                  <p className="flex items-center gap-2 text-xs text-navy-deep/60">
                    <Spinner className="h-3 w-3" /> Consultando disponibilidad en tiempo real…
                  </p>
                )}
                {!loading && loadError && (
                  <Alert tone="danger" className="mt-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>{loadError}</span>
                      <Button size="sm" variant="outline" onClick={() => void load()}>
                        Reintentar
                      </Button>
                    </div>
                  </Alert>
                )}
                {!loading && !loadError && counts.size === 0 && (
                  <p className="text-sm text-navy-deep/65">
                    No hay horarios disponibles este mes.{" "}
                    {canNext && (
                      <button type="button" className="font-medium text-navy underline underline-offset-2" onClick={() => setMonth((m) => m.plus({ months: 1 }))}>
                        Ver el mes siguiente
                      </button>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className={cn(step === "date" && "hidden md:block")}>
              {step === "time" && (
                <BackButton className="mb-3 md:hidden" onClick={() => setStep("date")}>
                  Calendario
                </BackButton>
              )}
              <h2
                ref={step === "time" ? stepHeading : undefined}
                tabIndex={-1}
                className="font-display text-[20px] leading-tight first-letter:uppercase"
              >
                {selectedDate ? selectedDateLabel : "Horarios"}
              </h2>
              <p className="mb-3 text-xs text-navy-deep/55">{tzLabel(timezone)}</p>
              {!selectedDate ? (
                loading ? (
                  <SlotSkeleton />
                ) : (
                  <p className="rounded-2xl bg-navy-50 p-4 text-sm text-navy-deep/60">
                    Selecciona un día disponible para ver los horarios.
                  </p>
                )
              ) : (
                <ul className="grid max-h-[440px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-1" aria-label={`Horarios disponibles el ${selectedDateLabel}`}>
                  {daySlots.map((s) => (
                    <li key={s.start}>
                      <button
                        type="button"
                        onClick={() => pickSlot(s)}
                        aria-pressed={selectedSlot?.start === s.start}
                        className={cn(
                          "flex h-12 w-full items-center justify-center rounded-2xl text-[16px] font-semibold tabular-nums transition-all duration-300 ease-ios active:scale-[.96]",
                          selectedSlot?.start === s.start
                            ? "bg-navy-deep text-white shadow-[0_8px_18px_-10px_rgba(16,36,56,.8)]"
                            : "bg-navy-50 text-navy-deep hover:bg-navy-100",
                        )}
                      >
                        {slotLabel(s)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function BackButton({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "press inline-flex items-center gap-0.5 rounded-full py-1 pl-1 pr-3 text-[15px] font-medium text-guinda hover:bg-guinda-soft disabled:opacity-50",
        className,
      )}
      {...p}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </button>
  );
}

function SlotSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-2xl" />
      ))}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-guinda-tint" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v4.2l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-guinda-tint" aria-hidden="true">
      <rect x="2.5" y="5" width="10.5" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 9l4.5-2.5v7L13 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-guinda-tint" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
