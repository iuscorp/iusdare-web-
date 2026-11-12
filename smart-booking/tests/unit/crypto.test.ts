import { describe, expect, it } from "vitest";
import { bookingReference, decrypt, encrypt, safeEqual, signPayload, verifyPayload } from "@/server/security/crypto";

describe("cifrado de tokens", () => {
  it("roundtrip y IV aleatorio", () => {
    const a = encrypt("ya29.secret-token");
    const b = encrypt("ya29.secret-token");
    expect(a).not.toBe(b);
    expect(a).not.toContain("secret");
    expect(decrypt(a)).toBe("ya29.secret-token");
  });
  it("detecta manipulación (GCM)", () => {
    const parts = encrypt("hola").split(".");
    const data = Buffer.from(parts[3]!, "base64url");
    data[0] = data[0]! ^ 0xff;
    parts[3] = data.toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
    expect(() => decrypt("v0.a.b.c")).toThrow();
  });
});

describe("payload firmado (state OAuth)", () => {
  it("verifica y rechaza manipulación", () => {
    const s = signPayload({ p: "google", n: "abc" });
    expect(verifyPayload(s)).toEqual({ p: "google", n: "abc" });
    const [body, sig] = s.split(".");
    const forged = Buffer.from(JSON.stringify({ p: "microsoft", n: "abc" })).toString("base64url");
    expect(verifyPayload(`${forged}.${sig}`)).toBeNull();
    expect(verifyPayload(`${body}.x${sig}`)).toBeNull();
    expect(verifyPayload("garbage")).toBeNull();
  });
  it("safeEqual", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("referencia de reserva", () => {
  it("formato SB-XXXXXXXX sin caracteres ambiguos", () => {
    const refs = new Set(Array.from({ length: 500 }, bookingReference));
    expect(refs.size).toBe(500);
    for (const r of refs) expect(r).toMatch(/^SB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });
});
