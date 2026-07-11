export const quoteStatuses = ["DRAFT", "SENT", "APPROVED", "REJECTED"] as const;

export type QuoteStatus = (typeof quoteStatuses)[number];

export function isQuoteStatus(value: string): value is QuoteStatus {
  return quoteStatuses.includes(value as QuoteStatus);
}
