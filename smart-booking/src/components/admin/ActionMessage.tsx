import { Alert } from "@/components/ui/Card";

export function ActionMessage({ state }: { state: { ok?: boolean; error?: string; message?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}
