import type { QuoteStatus } from "@/domain/entities/quote";

export const quoteStatusLabels = {
  DRAFT: "Rascunho",
  SENT: "Enviado",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado"
} as const satisfies Record<QuoteStatus, string>;

export function getQuoteStatusLabel(status: QuoteStatus): string {
  return quoteStatusLabels[status];
}
