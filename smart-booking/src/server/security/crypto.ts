import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../env";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

function key(): Buffer {
  const raw = Buffer.from(env().ENCRYPTION_KEY, "base64");
  if (raw.length !== 32) throw new Error("ENCRYPTION_KEY debe ser de 32 bytes codificados en base64");
  return raw;
}

/** Cifra un texto con AES-256-GCM. Formato: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Formato de dato cifrado inválido");
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string): string {
  return createHmac("sha256", env().AUTH_SECRET).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Firma un payload JSON (para el parámetro `state` de OAuth). */
export function signPayload(data: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyPayload<T = Record<string, unknown>>(signed: string): T | null {
  const [body, sig] = signed.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sin 0/O/1/I/L
export function bookingReference(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += REF_ALPHABET[bytes[i]! % REF_ALPHABET.length];
  return `SB-${out}`;
}
