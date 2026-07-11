import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";

export const serviceOrderTimelineTypes = {
  serviceOrderCreated: "SERVICE_ORDER_CREATED",
  statusChanged: "STATUS_CHANGED",
  diagnosticRecorded: "DIAGNOSTIC_RECORDED",
  diagnosticUpdated: "DIAGNOSTIC_UPDATED",
  quoteCreated: "QUOTE_CREATED",
  quoteSent: "QUOTE_SENT",
  quoteApproved: "QUOTE_APPROVED",
  quoteRejected: "QUOTE_REJECTED"
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

export function createDiagnosticRecordedTimelineDescription(): string {
  return "Diagnostico tecnico registrado.";
}

export function createDiagnosticUpdatedTimelineDescription(): string {
  return "Diagnostico tecnico atualizado.";
}

export function createQuoteCreatedTimelineDescription(): string {
  return "Orcamento criado em rascunho.";
}

export function createQuoteSentTimelineDescription(): string {
  return "Orcamento marcado como enviado.";
}

export function createQuoteApprovedTimelineDescription(): string {
  return "Aprovacao interna do orcamento registrada.";
}

export function createQuoteRejectedTimelineDescription(): string {
  return "Rejeicao interna do orcamento registrada.";
}
