import "server-only";
import { prisma } from "../db";
import { fakeCalendarsEnabled } from "../env";
import { fakeDestination, fakeGoogleBusy, fakeMicrosoftBusy } from "./fake";
import { googleBusySource, googleDestination } from "./google";
import { microsoftBusySource } from "./microsoft";
import type { BusySource, EventDestination, ProviderId } from "./types";

/**
 * Punto único para obtener las fuentes de ocupados y el destino de eventos.
 * Para añadir un proveedor nuevo: implementar BusySource/EventDestination y registrarlo aquí.
 */
interface Overrides {
  busySources?: BusySource[];
  destination?: EventDestination | null;
}
let overrides: Overrides | null = null;

/** Solo tests: inyecta implementaciones simuladas. */
export function __setCalendarOverrides(o: Overrides | null) {
  overrides = o;
}

export interface ActiveSources {
  sources: BusySource[];
  /** Proveedores que deberían consultarse pero están en estado ERROR (→ fallar cerrado) */
  broken: ProviderId[];
  googleReady: boolean;
}

export async function getActiveBusySources(): Promise<ActiveSources> {
  if (overrides?.busySources) {
    return { sources: overrides.busySources, broken: [], googleReady: overrides.destination !== null };
  }
  if (fakeCalendarsEnabled()) return { sources: [fakeGoogleBusy, fakeMicrosoftBusy], broken: [], googleReady: true };

  const integrations = await prisma.calendarIntegration.findMany();
  const sources: BusySource[] = [];
  const broken: ProviderId[] = [];
  let googleReady = false;
  for (const i of integrations) {
    if (i.status === "DISCONNECTED") continue;
    if (i.status === "ERROR" && !i.refreshTokenEnc) {
      broken.push(i.provider);
      continue;
    }
    // Las integraciones en ERROR con refresh token se intentan igualmente (puede ser un fallo transitorio).
    if (i.provider === "GOOGLE") {
      sources.push(googleBusySource);
      googleReady = true;
    } else {
      sources.push(microsoftBusySource);
    }
  }
  return { sources, broken, googleReady };
}

export function getEventDestination(): EventDestination | null {
  if (overrides && "destination" in overrides) return overrides.destination ?? null;
  if (fakeCalendarsEnabled()) return fakeDestination;
  return googleDestination;
}
