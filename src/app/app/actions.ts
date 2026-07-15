"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import {
  resolveAuthenticatedContextFromSessionToken,
  type AuthenticatedContext
} from "@/server/auth/authenticated-context";
import { invalidateAuthSession } from "@/server/auth/session-service";
import {
  AUTH_SESSION_COOKIE_NAME,
  getExpiredSessionCookieOptions
} from "@/server/auth/session-cookie";
import { getSecurityRequestOrigin } from "@/server/security/request-origin";
import { recordSecurityAuditEvent } from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const origin = await getSecurityRequestOrigin();
  let context: AuthenticatedContext | null = null;

  if (sessionToken) {
    try {
      context = await resolveAuthenticatedContextFromSessionToken(sessionToken);
    } catch (error) {
      if (!(error instanceof AuthenticationError)) {
        throw error;
      }
    }
  }

  if (sessionToken) {
    await invalidateAuthSession(sessionToken);
  }

  cookieStore.set(
    AUTH_SESSION_COOKIE_NAME,
    "",
    getExpiredSessionCookieOptions()
  );

  await recordSecurityAuditEvent({
    eventType: securityAuditEventTypes.logout,
    outcome: securityAuditOutcomes.success,
    organizationId: context?.organizationId,
    userId: context?.userId,
    originHash: origin.originHash
  });

  redirect("/login");
}
