"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AuthenticationError,
  INVALID_CREDENTIALS_MESSAGE
} from "@/domain/errors/authentication-error";
import { loginWithEmailAndPassword } from "@/server/auth/login-service";
import {
  AUTH_SESSION_COOKIE_NAME,
  getSessionCookieOptions
} from "@/server/auth/session-cookie";
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
import { createLoginSecuritySubject } from "@/server/security/security-identifiers";

export type LoginActionState = {
  error?: string;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = getStringFormValue(formData, "email");
  const password = getStringFormValue(formData, "password");
  const origin = await getSecurityRequestOrigin();
  const loginSubject = createLoginSecuritySubject(email);

  try {
    await enforceRateLimit({
      operation: rateLimitOperations.loginAttempt,
      keyParts: [loginSubject.subjectHash, origin.originHash],
      subjectHash: loginSubject.subjectHash,
      origin
    });

    const result = await loginWithEmailAndPassword({
      email,
      password
    });

    const cookieStore = await cookies();

    cookieStore.set(
      AUTH_SESSION_COOKIE_NAME,
      result.sessionToken,
      getSessionCookieOptions(result.expiresAt)
    );

    await recordSecurityAuditEvent({
      eventType: securityAuditEventTypes.loginSucceeded,
      outcome: securityAuditOutcomes.success,
      organizationId: result.user.organizationId,
      userId: result.user.id,
      subjectHash: loginSubject.subjectHash,
      originHash: origin.originHash,
      metadata: {
        role: result.user.role
      }
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return {
        error: RATE_LIMIT_EXCEEDED_MESSAGE
      };
    }

    if (error instanceof AuthenticationError) {
      await recordSecurityAuditEvent({
        eventType: securityAuditEventTypes.loginRejected,
        outcome: securityAuditOutcomes.failure,
        subjectHash: loginSubject.subjectHash,
        originHash: origin.originHash,
        metadata: {
          reason: "invalid_credentials"
        }
      });

      return {
        error: INVALID_CREDENTIALS_MESSAGE
      };
    }

    throw error;
  }

  redirect("/app");
}
