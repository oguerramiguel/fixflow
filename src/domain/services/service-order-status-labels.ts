import type { ServiceOrderStatus } from "@/domain/entities/service-order";

export const serviceOrderStatusLabels = {
  RECEIVED: "Recebido",
  IN_DIAGNOSIS: "Em diagnostico",
  WAITING_FOR_APPROVAL: "Aguardando aprovacao",
  APPROVED: "Aprovado",
  IN_REPAIR: "Em manutencao",
  FINAL_TESTING: "Testes finais",
  READY_FOR_PICKUP: "Pronto para retirada",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado"
} as const satisfies Record<ServiceOrderStatus, string>;

export const serviceOrderStatusActionLabels: Partial<
  Record<ServiceOrderStatus, string>
> = {
  IN_DIAGNOSIS: "Iniciar diagnostico",
  WAITING_FOR_APPROVAL: "Aguardar aprovacao",
  APPROVED: "Marcar como aprovado",
  IN_REPAIR: "Iniciar manutencao",
  FINAL_TESTING: "Enviar para testes finais",
  READY_FOR_PICKUP: "Liberar para retirada",
  COMPLETED: "Concluir ordem de servico",
  CANCELLED: "Cancelar ordem de servico"
};

export function getServiceOrderStatusLabel(
  status: ServiceOrderStatus
): string {
  return serviceOrderStatusLabels[status];
}

export function getServiceOrderStatusActionLabel(
  status: ServiceOrderStatus
): string {
  return serviceOrderStatusActionLabels[status] ?? getServiceOrderStatusLabel(status);
}
