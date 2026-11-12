/** Etiquetas y tonos de estado compartidos (UI pública y panel). */
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAYMENT_PENDING: "Pago pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Reprogramada",
  EXPIRED: "Expirada",
  FAILED: "Fallida",
};

export const BOOKING_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "gold"> = {
  PENDING: "warning",
  PAYMENT_PENDING: "gold",
  CONFIRMED: "success",
  CANCELLED: "danger",
  RESCHEDULED: "info",
  EXPIRED: "neutral",
  FAILED: "danger",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  EXPIRED: "Expirado",
  REFUNDED: "Reembolsado",
};
