import "server-only";
import { env } from "../env";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export const MICROSOFT_SCOPES = ["openid", "email", "offline_access", "User.Read", "Calendars.Read"];

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export function microsoftAuthority() {
  return `https://login.microsoftonline.com/${encodeURIComponent(env().MICROSOFT_TENANT_ID)}/oauth2/v2.0`;
}

export function redirectUri(provider: "google" | "microsoft") {
  return `${env().APP_URL.replace(/\/$/, "")}/api/oauth/${provider}/callback`;
}
