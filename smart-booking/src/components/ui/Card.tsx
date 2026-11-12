import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-white shadow-card", className)} {...p} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...p
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" | "gold" }) {
  const tones = {
    neutral: "bg-navy-100 text-navy-deep",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
    danger: "bg-red-50 text-red-800 ring-red-600/20",
    info: "bg-sky-50 text-sky-800 ring-sky-600/20",
    gold: "bg-guinda-soft text-guinda ring-guinda/20",
  } as const;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent", tones[tone], className)}
      {...p}
    />
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "danger" | "success" | "warning";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-navy-200 bg-navy-50 text-navy-deep",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm animate-fade-up", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}
