import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { PublicShell } from "@/components/booking/PublicShell";
import { getPublicMeetingType } from "@/server/public/meeting-types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mt = await getPublicMeetingType(slug);
  if (!mt) return { title: "Reunión no encontrada" };
  return {
    title: mt.name,
    description: mt.description,
    openGraph: { title: mt.name, description: mt.description, type: "website" },
  };
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const meeting = await getPublicMeetingType(slug);
  if (!meeting) notFound();

  return (
    <PublicShell>
      {meeting.bookable ? (
        <BookingFlow meeting={meeting} />
      ) : (
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-lift sm:p-10">
          <p className="eyebrow text-gold-dark">{meeting.durationMinutes} min</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-navy-deep">{meeting.name}</h1>
          <p className="mt-4 text-sm leading-relaxed text-navy-deep/70">
            Esta modalidad aún no está disponible para reservas en línea. Vuelve a intentarlo pronto.
          </p>
        </div>
      )}
    </PublicShell>
  );
}
