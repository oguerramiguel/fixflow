"use server";

import { ValidationError } from "@/domain/errors/validation-error";
import type { AccountSetupPasswordField } from "@/server/services/account-setup-service";
import {
  ACCOUNT_SETUP_UNAVAILABLE_MESSAGE,
  completeAccountSetup
} from "@/server/services/account-setup-service";
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
import { createAccountSetupSecuritySubject } from "@/server/security/security-identifiers";

export type AccountSetupFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<AccountSetupPasswordField, string>>;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function completeAccountSetupAction(
  token: string,
  _previousState: AccountSetupFormState,
  formData: FormData
): Promise<AccountSetupFormState> {
  const origin = await getSecurityRequestOrigin();
  const subject = createAccountSetupSecuritySubject(token);

  try {
    await enforceRateLimit({
      operation: rateLimitOperations.accountSetupAttempt,
      keyParts: [],
      subjectHash: subject.subjectHash,
      origin
    });

    const result = await completeAccountSetup(token, {
      password: getStringFormValue(formData, "password"),
      passwordConfirmation: getStringFormValue(
        formData,
        "passwordConfirmation"
      )
    });

    if (!result) {
      return {
        error: ACCOUNT_SETUP_UNAVAILABLE_MESSAGE
      };
    }

    await recordSecurityAuditEvent({
      eventType: securityAuditEventTypes.userInvitationUsed,
      outcome: securityAuditOutcomes.success,
      organizationId: result.organizationId,
      userId: result.userId,
      subjectHash: subject.subjectHash,
      originHash: origin.originHash,
      metadata: {
        role: result.role
      }
    });

    return {
      success: "Conta configurada com sucesso. Voce ja pode entrar no FixFlow."
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
          Record<AccountSetupPasswordField, string>
        >
      };
    }

    throw error;
  }
}
