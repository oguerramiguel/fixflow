"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { DomainError } from "@/domain/errors/domain-error";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  requireAuthenticatedContext,
  type AuthenticatedContext
} from "@/server/auth/authenticated-context";
import {
  AUTH_SESSION_COOKIE_NAME,
  getExpiredSessionCookieOptions
} from "@/server/auth/session-cookie";
import { enforceRateLimit } from "@/server/security/rate-limit-service";
import {
  RATE_LIMIT_EXCEEDED_MESSAGE,
  RateLimitExceededError,
  rateLimitOperations
} from "@/server/security/rate-limit-types";
import {
  getSecurityRequestOrigin,
  type SecurityRequestOrigin
} from "@/server/security/request-origin";
import { recordSecurityAuditEvent } from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";
import { hashSecurityValue } from "@/server/security/security-hash";
import {
  changeOwnPassword,
  type PasswordChangeField
} from "@/server/services/password-service";

export type PasswordChangeActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<PasswordChangeField, string>>;
};

type PasswordChangeSecurityContext = {
  context: AuthenticatedContext;
  origin: SecurityRequestOrigin;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

async function getPasswordChangeSecurityContext(): Promise<PasswordChangeSecurityContext> {
  try {
    const [context, origin] = await Promise.all([
      requireAuthenticatedContext(),
      getSecurityRequestOrigin()
    ]);

    return {
      context,
      origin
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    throw error;
  }
}

export async function changeOwnPasswordAction(
  _previousState: PasswordChangeActionState,
  formData: FormData
): Promise<PasswordChangeActionState> {
  const security = await getPasswordChangeSecurityContext();
  const userSubjectHash = hashSecurityValue(security.context.userId);

  try {
    await enforceRateLimit({
      operation: rateLimitOperations.passwordChangeAttempt,
      keyParts: [
        hashSecurityValue(security.context.organizationId),
        userSubjectHash
      ],
      subjectHash: userSubjectHash,
      origin: security.origin
    });

    const result = await changeOwnPassword(security.context, {
      currentPassword: getStringFormValue(formData, "currentPassword"),
      newPassword: getStringFormValue(formData, "newPassword"),
      newPasswordConfirmation: getStringFormValue(
        formData,
        "newPasswordConfirmation"
      )
    });

    await recordSecurityAuditEvent({
      eventType: securityAuditEventTypes.passwordChanged,
      outcome: securityAuditOutcomes.success,
      organizationId: result.organizationId,
      userId: result.userId,
      subjectHash: userSubjectHash,
      originHash: security.origin.originHash,
      metadata: {
        revokedCount: result.revokedSessionCount
      }
    });

    const cookieStore = await cookies();
    cookieStore.set(
      AUTH_SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions()
    );

    return {
      success:
        "Senha alterada com sucesso. Todas as sessoes foram encerradas; entre novamente."
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
          Record<PasswordChangeField, string>
        >
      };
    }

    if (error instanceof DomainError) {
      return {
        error: error.message
      };
    }

    throw error;
  }
}
