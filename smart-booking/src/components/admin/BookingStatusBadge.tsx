import { Badge } from "@/components/ui/Card";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/status";

export function BookingStatusBadge({ status }: { status: string }) {
  return <Badge tone={BOOKING_STATUS_TONE[status] ?? "neutral"}>{BOOKING_STATUS_LABEL[status] ?? status}</Badge>;
}
