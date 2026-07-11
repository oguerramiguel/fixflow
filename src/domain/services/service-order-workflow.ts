import { DomainError } from "@/domain/errors/domain-error";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";

export const serviceOrderStatusTransitions = {
  RECEIVED: ["IN_DIAGNOSIS", "CANCELLED"],
  IN_DIAGNOSIS: ["WAITING_FOR_APPROVAL", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_REPAIR", "CANCELLED"],
  IN_REPAIR: ["FINAL_TESTING", "CANCELLED"],
  FINAL_TESTING: ["READY_FOR_PICKUP"],
  READY_FOR_PICKUP: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: []
} as const satisfies Record<ServiceOrderStatus, readonly ServiceOrderStatus[]>;

const specializedServiceOrderTransitionMessages = {
  "IN_DIAGNOSIS->WAITING_FOR_APPROVAL":
    "Envie o orcamento para colocar a ordem em espera de aprovacao.",
  "WAITING_FOR_APPROVAL->APPROVED":
    "Registre a aprovacao do orcamento para aprovar a ordem de servico."
} as const;

type SpecializedServiceOrderTransitionKey =
  keyof typeof specializedServiceOrderTransitionMessages;

function createServiceOrderTransitionKey(
  currentStatus: ServiceOrderStatus,
  nextStatus: ServiceOrderStatus
): `${ServiceOrderStatus}->${ServiceOrderStatus}` {
  return `${currentStatus}->${nextStatus}`;
}

export function getAllowedNextServiceOrderStatuses(
  currentStatus: ServiceOrderStatus
): ServiceOrderStatus[] {
  const allowedStatuses: readonly ServiceOrderStatus[] =
    serviceOrderStatusTransitions[currentStatus];

  return [...allowedStatuses];
}

export function canTransitionServiceOrderStatus(
  currentStatus: ServiceOrderStatus,
  nextStatus: ServiceOrderStatus
): boolean {
  const allowedStatuses: readonly ServiceOrderStatus[] =
    serviceOrderStatusTransitions[currentStatus];

  return allowedStatuses.includes(nextStatus);
}

export function assertServiceOrderStatusTransition(
  currentStatus: ServiceOrderStatus,
  nextStatus: ServiceOrderStatus
): void {
  if (!canTransitionServiceOrderStatus(currentStatus, nextStatus)) {
    throw new DomainError("Transicao de status invalida para a ordem de servico.");
  }
}

export function getSpecializedServiceOrderTransitionMessage(
  currentStatus: ServiceOrderStatus,
  nextStatus: ServiceOrderStatus
): string | undefined {
  const key = createServiceOrderTransitionKey(currentStatus, nextStatus);

  return specializedServiceOrderTransitionMessages[
    key as SpecializedServiceOrderTransitionKey
  ];
}

export function isServiceOrderTransitionManagedBySpecializedFlow(
  currentStatus: ServiceOrderStatus,
  nextStatus: ServiceOrderStatus
): boolean {
  return Boolean(
    getSpecializedServiceOrderTransitionMessage(currentStatus, nextStatus)
  );
}
