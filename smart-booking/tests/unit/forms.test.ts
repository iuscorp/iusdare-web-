import { describe, expect, it } from "vitest";
import { buildAnswersSchema, formatAnswer, parseFormFields } from "@/lib/forms/schema";
import { DEFAULT_MEETING_TYPES } from "@/lib/meeting-type-defaults";

const fieldsOf = (slug: string) => parseFormFields(DEFAULT_MEETING_TYPES.find((m) => m.slug === slug)!.formFields);
const schemaOf = (slug: string) => buildAnswersSchema(fieldsOf(slug));
const core = { fullName: "Ana Torres", phone: "+51 987 654 321", email: "Ana@Example.com" };

describe("formularios por tipo de reunión", () => {
  it("las definiciones por defecto son válidas", () => {
    for (const mt of DEFAULT_MEETING_TYPES) expect(() => parseFormFields(mt.formFields)).not.toThrow();
  });

  it("cafecito: válido, email normalizado", () => {
    const r = schemaOf("cafecito-virtual").parse({ ...core, topic: "Hablemos de una alianza estratégica" });
    expect(r.email).toBe("ana@example.com");
  });

  it("email inválido", () => {
    expect(schemaOf("cafecito-virtual").safeParse({ ...core, email: "no-es-email", topic: "x".repeat(20) }).success).toBe(false);
  });

  it.each(["123", "abc-def-ghij", "+51 9".padEnd(30, "9")])("teléfono inválido: %s", (phone) => {
    expect(schemaOf("asesoria").safeParse({ ...core, phone, topic: "x".repeat(20) }).success).toBe(false);
  });

  it.each(["+51 987 654 321", "(01) 444-5555", "987654321"])("teléfono válido: %s", (phone) => {
    expect(schemaOf("asesoria").safeParse({ ...core, phone, topic: "x".repeat(20) }).success).toBe(true);
  });

  it("textarea obligatorio con mínimo y máximo", () => {
    const s = schemaOf("asesoria");
    expect(s.safeParse({ ...core, topic: "corto" }).success).toBe(false);
    expect(s.safeParse({ ...core, topic: "x".repeat(3001) }).success).toBe(false);
    expect(s.safeParse({ ...core }).success).toBe(false);
  });

  it("caracteres de control eliminados (saltos de línea conservados en textarea)", () => {
    const r = schemaOf("cafecito-virtual").parse({
      ...core,
      fullName: "Ana\u0000 Torres\u0007",
      topic: "Línea 1\nLínea 2\u0008 con texto suficiente",
    });
    expect(r.fullName).toBe("Ana Torres");
    expect(r.topic).toBe("Línea 1\nLínea 2 con texto suficiente");
  });

  it("claves desconocidas rechazadas", () => {
    expect(schemaOf("cafecito-virtual").safeParse({ ...core, topic: "x".repeat(20), isAdmin: true }).success).toBe(false);
  });

  describe("vocare-iuris: ramas del Derecho (multiselect)", () => {
    const s = schemaOf("vocare-iuris");
    it("varias opciones", () => {
      const r = s.parse({ ...core, lawBranches: { selected: ["derecho-penal", "compliance", "derecho-penal"] } });
      expect(r.lawBranches).toEqual({ selected: ["derecho-penal", "compliance"] });
    });
    it("al menos una opción", () => {
      expect(s.safeParse({ ...core, lawBranches: { selected: [] } }).success).toBe(false);
    });
    it("opción personalizada sola es suficiente", () => {
      const r = s.parse({ ...core, lawBranches: { selected: [], custom: "Derecho ambiental" } });
      expect(r.lawBranches).toEqual({ selected: [], custom: "Derecho ambiental" });
    });
    it("opción no listada rechazada", () => {
      expect(s.safeParse({ ...core, lawBranches: { selected: ["derecho-espacial"] } }).success).toBe(false);
    });
    it("formatAnswer muestra etiquetas legibles", () => {
      const f = fieldsOf("vocare-iuris")[0]!;
      expect(formatAnswer(f, { selected: ["derecho-digital-y-nuevas-tecnologias"], custom: "Ambiental" })).toBe(
        "Derecho digital y nuevas tecnologías, Otra rama (especifica): Ambiental",
      );
    });
    it("incluye las 14 ramas iniciales", () => {
      expect(fieldsOf("vocare-iuris")[0]!.options).toHaveLength(14);
    });
  });
});
