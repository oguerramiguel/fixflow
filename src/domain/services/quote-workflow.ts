import { DomainError } from "@/domain/errors/domain-error";
import type { QuoteStatus } from "@/domain/entities/quote";

export const quoteStatusTransitions = {
  DRAFT: ["SENT"],
  SENT: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: []
} as const satisfies Record<QuoteStatus, readonly QuoteStatus[]>;

export function canTransitionQuoteStatus(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus
): boolean {
  const allowedStatuses: readonly QuoteStatus[] =
    quoteStatusTransitions[currentStatus];

  return allowedStatuses.includes(nextStatus);
}

export function assertQuoteStatusTransition(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus
): void {
  if (!canTransitionQuoteStatus(currentStatus, nextStatus)) {
    throw new DomainError("Transicao de status invalida para o orcamento.");
  }
}
