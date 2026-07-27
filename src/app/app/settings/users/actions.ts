"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { UserManagementField } from "@/domain/services/user-management-validation";
import {
  requireAuthenticatedContext,
  type AuthenticatedContext
} from "@/server/auth/authenticated-context";
import {
  getSecurityRequestOrigin,
  type SecurityRequestOrigin
} from "@/server/security/request-origin";
import { recordSecurityAuditEvent } from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes,
  type SecurityAuditEventType
} from "@/server/security/security-audit-types";
import { hashSecurityValue } from "@/server/security/security-hash";
import {
  changeUserRole,
  disableOrganizationUser,
  inviteOrganizationUser,
  reactivateOrganizationUser,
  reissueUserInvitation,
  revokeAllOrganizationUserSessions,
  revokeUserInvitation,
  type UserManagementOperationResult
} from "@/server/services/user-management-service";

export type InviteUserFormValues = {
  name: string;
  email: string;
  role: string;
};

export type UserManagementActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<UserManagementField, string>>;
  values?: InviteUserFormValues;
  setupPath?: string;
  expiresAt?: string;
};

type UserManagementOperation =
  | "invite_user"
  | "reissue_invitation"
  | "revoke_invitation"
  | "change_role"
  | "disable_user"
  | "reactivate_user"
  | "revoke_sessions";

type ActionSecurityContext = {
  context: AuthenticatedContext;
  origin: SecurityRequestOrigin;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

async function getActionSecurityContext(): Promise<ActionSecurityContext> {
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

async function recordUserManagementAudit(
  security: ActionSecurityContext,
  input: {
    eventType: SecurityAuditEventType;
    targetUserId?: string;
    outcome?: "success" | "blocked";
    metadata?: Record<string, string | number | boolean | null | undefined>;
  }
): Promise<void> {
  await recordSecurityAuditEvent({
    eventType: input.eventType,
    outcome:
      input.outcome === "blocked"
        ? securityAuditOutcomes.blocked
        : securityAuditOutcomes.success,
    organizationId: security.context.organizationId,
    userId: security.context.userId,
    subjectHash: input.targetUserId
      ? hashSecurityValue(input.targetUserId)
      : undefined,
    originHash: security.origin.originHash,
    metadata: input.metadata
  });
}

async function handleUserManagementError(
  error: unknown,
  security: ActionSecurityContext | null,
  operation: UserManagementOperation,
  targetUserId?: string,
  values?: InviteUserFormValues
): Promise<UserManagementActionState> {
  if (error instanceof AuthenticationError) {
    redirect("/login");
  }

  if (security) {
    await recordUserManagementAudit(security, {
      eventType: securityAuditEventTypes.userAdminOperationRejected,
      targetUserId,
      outcome: "blocked",
      metadata: {
        operation,
        reason: error instanceof Error ? error.name : "UnknownError"
      }
    });
  }

  if (error instanceof ValidationError) {
    return {
      error: error.message,
      fieldErrors: error.fieldErrors as Partial<
        Record<UserManagementField, string>
      >,
      values
    };
  }

  if (
    error instanceof AuthorizationError ||
    error instanceof ConflictError ||
    error instanceof NotFoundError ||
    error instanceof DomainError
  ) {
    return {
      error: error.message,
      values
    };
  }

  throw error;
}

function revalidateUsersPage(): void {
  revalidatePath("/app/settings/users");
}

async function auditSessionAndInvitationRevocation(
  security: ActionSecurityContext,
  result: UserManagementOperationResult
): Promise<void> {
  await recordUserManagementAudit(security, {
    eventType: securityAuditEventTypes.userSessionsRevoked,
    targetUserId: result.user.id,
    metadata: {
      revokedCount: result.revokedSessionCount,
      reason: "user_disabled"
    }
  });

  if (result.revokedInvitationCount > 0) {
    await recordUserManagementAudit(security, {
      eventType: securityAuditEventTypes.userInvitationRevoked,
      targetUserId: result.user.id,
      metadata: {
        reason: "user_disabled"
      }
    });
  }
}

export async function inviteUserAction(
  _previousState: UserManagementActionState,
  formData: FormData
): Promise<UserManagementActionState> {
  const values: InviteUserFormValues = {
    name: getStringFormValue(formData, "name"),
    email: getStringFormValue(formData, "email"),
    role: getStringFormValue(formData, "role")
  };
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await inviteOrganizationUser(security.context, values);

    await recordUserManagementAudit(security, {
      eventType: securityAuditEventTypes.userInvited,
      targetUserId: result.user.id,
      metadata: {
        role: result.user.role,
        invitationExpiresAt: result.expiresAt.toISOString(),
        invitationMode: "created"
      }
    });
    revalidateUsersPage();

    return {
      success:
        "Usuario convidado. Copie o link agora; ele nao sera exibido novamente.",
      setupPath: result.setupPath,
      expiresAt: result.expiresAt.toISOString()
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "invite_user",
      undefined,
      values
    );
  }
}

export async function changeUserRoleAction(
  userId: string,
  _previousState: UserManagementActionState,
  formData: FormData
): Promise<UserManagementActionState> {
  const role = getStringFormValue(formData, "role");
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await changeUserRole(security.context, userId, role);

    if (result.changed) {
      await recordUserManagementAudit(security, {
        eventType: securityAuditEventTypes.userRoleChanged,
        targetUserId: result.user.id,
        metadata: {
          role: result.user.role
        }
      });
    }
    revalidateUsersPage();

    return {
      success: result.changed
        ? "Funcao atualizada com sucesso."
        : "A funcao ja estava atualizada."
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "change_role",
      userId
    );
  }
}

export async function disableUserAction(
  userId: string,
  _previousState: UserManagementActionState,
  _formData: FormData
): Promise<UserManagementActionState> {
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await disableOrganizationUser(security.context, userId);

    if (result.changed) {
      await recordUserManagementAudit(security, {
        eventType: securityAuditEventTypes.userDisabled,
        targetUserId: result.user.id,
        metadata: {
          role: result.user.role
        }
      });
      await auditSessionAndInvitationRevocation(security, result);
    }
    revalidateUsersPage();

    return {
      success: result.changed
        ? "Usuario desativado e sessoes revogadas."
        : "O usuario ja estava desativado."
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "disable_user",
      userId
    );
  }
}

export async function reactivateUserAction(
  userId: string,
  _previousState: UserManagementActionState,
  _formData: FormData
): Promise<UserManagementActionState> {
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await reactivateOrganizationUser(security.context, userId);

    if (result.changed) {
      await recordUserManagementAudit(security, {
        eventType: securityAuditEventTypes.userReactivated,
        targetUserId: result.user.id,
        metadata: {
          role: result.user.role
        }
      });
    }
    revalidateUsersPage();

    return {
      success: result.changed
        ? "Usuario reativado com sucesso."
        : "O usuario ja estava ativo."
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "reactivate_user",
      userId
    );
  }
}

export async function revokeUserSessionsAction(
  userId: string,
  _previousState: UserManagementActionState,
  _formData: FormData
): Promise<UserManagementActionState> {
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await revokeAllOrganizationUserSessions(
      security.context,
      userId
    );

    await recordUserManagementAudit(security, {
      eventType: securityAuditEventTypes.userSessionsRevoked,
      targetUserId: result.user.id,
      metadata: {
        revokedCount: result.revokedSessionCount,
        reason: "owner_requested"
      }
    });
    revalidateUsersPage();

    return {
      success: `${result.revokedSessionCount} sessao(oes) revogada(s).`
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "revoke_sessions",
      userId
    );
  }
}

export async function revokeInvitationAction(
  userId: string,
  _previousState: UserManagementActionState,
  _formData: FormData
): Promise<UserManagementActionState> {
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await revokeUserInvitation(security.context, userId);

    await recordUserManagementAudit(security, {
      eventType: securityAuditEventTypes.userInvitationRevoked,
      targetUserId: result.user.id,
      metadata: {
        reason: "owner_requested"
      }
    });
    revalidateUsersPage();

    return {
      success: "Convite revogado com sucesso."
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "revoke_invitation",
      userId
    );
  }
}

export async function reissueInvitationAction(
  userId: string,
  _previousState: UserManagementActionState,
  _formData: FormData
): Promise<UserManagementActionState> {
  let security: ActionSecurityContext | null = null;

  try {
    security = await getActionSecurityContext();
    const result = await reissueUserInvitation(security.context, userId);

    await recordUserManagementAudit(security, {
      eventType: securityAuditEventTypes.userInvited,
      targetUserId: result.user.id,
      metadata: {
        role: result.user.role,
        invitationExpiresAt: result.expiresAt.toISOString(),
        invitationMode: "reissued"
      }
    });
    revalidateUsersPage();

    return {
      success:
        "Novo link gerado. Copie-o agora; ele nao sera exibido novamente.",
      setupPath: result.setupPath,
      expiresAt: result.expiresAt.toISOString()
    };
  } catch (error) {
    return handleUserManagementError(
      error,
      security,
      "reissue_invitation",
      userId
    );
  }
}
