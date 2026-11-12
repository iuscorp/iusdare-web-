import { describe, expect, it } from "vitest";
import { __test__ } from "@/server/logger";

describe("logger: redacción de datos sensibles", () => {
  it("redacta claves sensibles en profundidad", () => {
    const out = __test__.redact({
      bookingId: "b1",
      email: "a@b.com",
      participant: { fullName: "Ana", phone: "999", meta: { accessToken: "x", refresh_token: "y" } },
      headers: { authorization: "Bearer z", cookie: "c" },
      list: [{ password: "p", ok: 1 }],
    }) as Record<string, any>;
    const s = JSON.stringify(out);
    for (const secret of ["a@b.com", "Ana", "999", "Bearer z", '"x"', '"y"', '"p"']) expect(s).not.toContain(secret);
    expect(out.bookingId).toBe("b1");
    expect(out.list[0].ok).toBe(1);
  });
  it("serializa errores", () => {
    const out = __test__.redact({ err: new Error("boom") }) as { err: { message: string } };
    expect(out.err.message).toBe("boom");
  });
});
