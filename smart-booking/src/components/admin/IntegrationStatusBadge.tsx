import { Badge } from "@/components/ui/Card";

export function IntegrationStatusBadge({ status }: { status: string }) {
  if (status === "CONNECTED") return <Badge tone="success">Conectado</Badge>;
  if (status === "ERROR") return <Badge tone="danger">Requiere atención</Badge>;
  return <Badge tone="neutral">Desconectado</Badge>;
}
