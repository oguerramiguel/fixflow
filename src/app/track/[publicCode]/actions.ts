"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { normalizeServiceOrderPublicCode } from "@/domain/services/public-code";
import { enforceRateLimit } from "@/server/security/rate-limit-service";
import {
  RATE_LIMIT_EXCEEDED_MESSAGE,
  RateLimitExceededError,
  rateLimitOperations,
  type RateLimitOperation
} from "@/server/security/rate-limit-types";
import { getSecurityRequestOrigin } from "@/server/security/request-origin";
import { recordSecurityAuditEvent } from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes,
  type SecurityAuditEventType
} from "@/server/security/security-audit-types";
import { createPublicCodeSecuritySubject } from "@/server/security/security-identifiers";
import {
  approvePublicQuote,
  rejectPublicQuote
} from "@/server/services/public-tracking-service";

export type PublicQuoteDecisionFormState = {
  error?: string;
};

const PUBLIC_DECISION_INTERNAL_ERROR_MESSAGE =
  "Nao foi possivel registrar a decisao do orcamento.";

function getSafePublicDecisionError(error: unknown): PublicQuoteDecisionFormState {
  if (error instanceof RateLimitExceededError) {
    return {
      error: RATE_LIMIT_EXCEEDED_MESSAGE
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      error: PUBLIC_DECISION_INTERNAL_ERROR_MESSAGE
    };
  }

  if (
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof DomainError
  ) {
    return {
      error: error.message
    };
  }

  throw error;
}

function revalidateAndRedirect(publicCodeInput: string): never {
  const publicCode =
    normalizeServiceOrderPublicCode(publicCodeInput) ?? publicCodeInput;
  const path = `/track/${publicCode}`;

  revalidatePath(path);
  redirect(path);
}

async function runPublicQuoteDecisionAction(
  publicCode: string,
  input: {
    operation: RateLimitOperation;
    auditEventType: SecurityAuditEventType;
    decide(publicCode: string): Promise<void>;
  }
): Promise<PublicQuoteDecisionFormState> {
  const origin = await getSecurityRequestOrigin();
  const publicCodeSubject = createPublicCodeSecuritySubject(publicCode);

  try {
    await enforceRateLimit({
      operation: input.operation,
      keyParts: [publicCodeSubject.subjectHash],
      subjectHash: publicCodeSubject.subjectHash,
      origin
    });

    await input.decide(publicCode);

    await recordSecurityAuditEvent({
      eventType: input.auditEventType,
      outcome: securityAuditOutcomes.success,
      subjectHash: publicCodeSubject.subjectHash,
      originHash: origin.originHash
    });
  } catch (error) {
    return getSafePublicDecisionError(error);
  }

  revalidateAndRedirect(publicCode);
}

export async function approvePublicQuoteAction(
  publicCode: string,
  _previousState: PublicQuoteDecisionFormState,
  _formData: FormData
): Promise<PublicQuoteDecisionFormState> {
  return runPublicQuoteDecisionAction(publicCode, {
    operation: rateLimitOperations.publicQuoteApprove,
    auditEventType: securityAuditEventTypes.publicQuoteApproved,
    decide: approvePublicQuote
  });
}

export async function rejectPublicQuoteAction(
  publicCode: string,
  _previousState: PublicQuoteDecisionFormState,
  _formData: FormData
): Promise<PublicQuoteDecisionFormState> {
  return runPublicQuoteDecisionAction(publicCode, {
    operation: rateLimitOperations.publicQuoteReject,
    auditEventType: securityAuditEventTypes.publicQuoteRejected,
    decide: rejectPublicQuote
  });
}
