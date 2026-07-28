"use server";

import { ValidationError } from "@/domain/errors/validation-error";
import { enforceRateLimit } from "@/server/security/rate-limit-service";
import {
  RATE_LIMIT_EXCEEDED_MESSAGE,
  RateLimitExceededError,
  rateLimitOperations
} from "@/server/security/rate-limit-types";
import { getSecurityRequestOrigin } from "@/server/security/request-origin";
import { recordSecurityAuditEvent } from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";
import { createPasswordResetSecuritySubject } from "@/server/security/security-identifiers";
import {
  completePasswordReset,
  PASSWORD_RESET_UNAVAILABLE_MESSAGE,
  type PasswordResetField
} from "@/server/services/password-reset-service";

export type PasswordResetActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<PasswordResetField, string>>;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function completePasswordResetAction(
  token: string,
  _previousState: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  const origin = await getSecurityRequestOrigin();
  const subject = createPasswordResetSecuritySubject(token);

  try {
    await enforceRateLimit({
      operation: rateLimitOperations.passwordResetConsume,
      keyParts: [],
      subjectHash: subject.subjectHash,
      origin
    });

    const result = await completePasswordReset(token, {
      password: getStringFormValue(formData, "password"),
      passwordConfirmation: getStringFormValue(
        formData,
        "passwordConfirmation"
      )
    });

    if (!result) {
      await recordSecurityAuditEvent({
        eventType: securityAuditEventTypes.passwordResetRejected,
        outcome: securityAuditOutcomes.failure,
        subjectHash: subject.subjectHash,
        originHash: origin.originHash,
        metadata: {
          reason: "unavailable"
        }
      });

      return {
        error: PASSWORD_RESET_UNAVAILABLE_MESSAGE
      };
    }

    await recordSecurityAuditEvent({
      eventType: securityAuditEventTypes.passwordResetCompleted,
      outcome: securityAuditOutcomes.success,
      organizationId: result.organizationId,
      userId: result.userId,
      subjectHash: subject.subjectHash,
      originHash: origin.originHash,
      metadata: {
        revokedCount: result.revokedSessionCount,
        replacedResetCount: result.revokedTokenCount
      }
    });

    if (result.revokedTokenCount > 0) {
      await recordSecurityAuditEvent({
        eventType: securityAuditEventTypes.passwordResetTokenRevoked,
        outcome: securityAuditOutcomes.success,
        organizationId: result.organizationId,
        userId: result.userId,
        subjectHash: subject.subjectHash,
        originHash: origin.originHash,
        metadata: {
          reason: "reset_completed",
          revokedCount: result.revokedTokenCount
        }
      });
    }

    return {
      success:
        "Senha redefinida com sucesso. Todas as sessoes anteriores foram encerradas."
    };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return {
        error: RATE_LIMIT_EXCEEDED_MESSAGE
      };
    }

    if (error instanceof ValidationError) {
      return {
        error: error.message,
        fieldErrors: error.fieldErrors as Partial<
          Record<PasswordResetField, string>
        >
      };
    }

    throw error;
  }
}
