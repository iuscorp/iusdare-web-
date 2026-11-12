/**
 * Seed idempotente: crea configuración, disponibilidad semanal inicial y los tres tipos de reunión.
 * No crea administradores ni precios (se configuran en el onboarding: /admin/setup).
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_MEETING_TYPES, DEFAULT_WEEKLY_RULES } from "../src/lib/meeting-type-defaults";

const prisma = new PrismaClient();

async function main() {
  await prisma.appSettings.upsert({ where: { id: 1 }, create: { id: 1, timezone: "America/Lima" }, update: {} });

  if ((await prisma.availabilityRule.count()) === 0) {
    await prisma.availabilityRule.createMany({ data: DEFAULT_WEEKLY_RULES });
    console.log("✓ Disponibilidad semanal inicial creada");
  }

  for (const mt of DEFAULT_MEETING_TYPES) {
    const { formFields, ...rest } = mt;
    await prisma.meetingType.upsert({
      where: { slug: mt.slug },
      create: { ...rest, formFields: formFields as object[] },
      // Solo se actualiza el formulario/descripcion; la configuración operativa la gestiona el panel.
      update: { name: rest.name, description: rest.description, eventTitle: rest.eventTitle, formFields: formFields as object[] },
    });
    console.log(`✓ Tipo de reunión: ${mt.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
