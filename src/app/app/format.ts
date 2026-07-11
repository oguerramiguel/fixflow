import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export function formatEquipmentType(type: string): string {
  switch (type) {
    case "NOTEBOOK":
      return "Notebook";
    case "DESKTOP":
      return "Desktop";
    default:
      return "Outro";
  }
}

export function formatServiceOrderStatus(status: ServiceOrderStatus): string {
  return getServiceOrderStatusLabel(status);
}
