"use client";

import { useMemo } from "react";
import { COMMON_TIMEZONES, tzLabel } from "./timezones";

export function TimezoneSelect({
  value,
  detected,
  onChange,
  id = "timezone",
}: {
  value: string;
  detected: string;
  onChange: (tz: string) => void;
  id?: string;
}) {
  const zones = useMemo(() => {
    let all: string[] = [];
    try {
      all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      all = [];
    }
    const common = Array.from(new Set([detected, value, ...COMMON_TIMEZONES]));
    const rest = all.filter((z) => !common.includes(z));
    return { common, rest };
  }, [detected, value]);

  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-navy-deep/60" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 10h15M10 2.5c2.2 2.3 2.2 12.7 0 15M10 2.5c-2.2 2.3-2.2 12.7 0 15" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <label htmlFor={id} className="sr-only">
        Zona horaria
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-navy-deep/15 bg-white px-2 text-sm text-navy-deep focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/60"
      >
        <optgroup label="Sugeridas">
          {zones.common.map((z) => (
            <option key={z} value={z}>
              {tzLabel(z)}
              {z === detected ? " · detectada" : ""}
            </option>
          ))}
        </optgroup>
        {zones.rest.length > 0 && (
          <optgroup label="Todas las zonas">
            {zones.rest.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
