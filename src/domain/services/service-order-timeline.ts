import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";

export const serviceOrderTimelineTypes = {
  serviceOrderCreated: "SERVICE_ORDER_CREATED",
  statusChanged: "STATUS_CHANGED"
} as const;

export type ServiceOrderTimelineType =
  (typeof serviceOrderTimelineTypes)[keyof typeof serviceOrderTimelineTypes];

export function createServiceOrderCreatedTimelineDescription(): string {
  return "Ordem de servico aberta com status Recebido.";
}

export function createServiceOrderStatusChangedTimelineDescription(
  currentStatus: ServiceOrderStatus,
  nextStatus: ServiceOrderStatus
): string {
  return `Status alterado de ${getServiceOrderStatusLabel(
    currentStatus
  )} para ${getServiceOrderStatusLabel(nextStatus)}.`;
}
