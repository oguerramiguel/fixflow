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
    throw new DomainError(
      `Service order cannot transition from ${currentStatus} to ${nextStatus}.`
    );
  }
}
