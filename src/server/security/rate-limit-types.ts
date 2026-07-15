import { DomainError } from "@/domain/errors/domain-error";

export const RATE_LIMIT_EXCEEDED_MESSAGE =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

export const rateLimitOperations = {
  loginAttempt: "LOGIN_ATTEMPT",
  publicPortalLookup: "PUBLIC_PORTAL_LOOKUP",
  publicQuoteApprove: "PUBLIC_QUOTE_APPROVE",
  publicQuoteReject: "PUBLIC_QUOTE_REJECT"
} as const;

export type RateLimitOperation =
  (typeof rateLimitOperations)[keyof typeof rateLimitOperations];

export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export class RateLimitExceededError extends DomainError {
  constructor(message = RATE_LIMIT_EXCEEDED_MESSAGE) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}
