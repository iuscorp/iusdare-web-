import type { Metadata } from "next";
import { BookingStatusView } from "@/components/booking/BookingStatusView";
import { PublicShell } from "@/components/booking/PublicShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estado de tu reserva", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; paid?: string; cancelled?: string }>;
};

export default async function StatusPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <PublicShell>
      <BookingStatusView id={id} token={sp.token ?? ""} paid={sp.paid === "1"} cancelled={sp.cancelled === "1"} />
    </PublicShell>
  );
}
