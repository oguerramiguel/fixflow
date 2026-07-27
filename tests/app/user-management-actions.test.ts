import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { NotFoundError } from "@/domain/errors/not-found-error";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  revalidatePath: vi.fn(),
  requireAuthenticatedContext: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  inviteOrganizationUser: vi.fn(),
  changeUserRole: vi.fn(),
  disableOrganizationUser: vi.fn(),
  reactivateOrganizationUser: vi.fn(),
  reissueUserInvitation: vi.fn(),
  revokeAllOrganizationUserSessions: vi.fn(),
  revokeUserInvitation: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("@/server/auth/authenticated-context", () => ({
  requireAuthenticatedContext: mocks.requireAuthenticatedContext
}));

vi.mock("@/server/security/request-origin", () => ({
  getSecurityRequestOrigin: mocks.getSecurityRequestOrigin
}));

vi.mock("@/server/security/security-audit-service", () => ({
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent
}));

vi.mock("@/server/services/user-management-service", () => ({
  inviteOrganizationUser: mocks.inviteOrganizationUser,
  changeUserRole: mocks.changeUserRole,
  disableOrganizationUser: mocks.disableOrganizationUser,
  reactivateOrganizationUser: mocks.reactivateOrganizationUser,
  reissueUserInvitation: mocks.reissueUserInvitation,
  revokeAllOrganizationUserSessions: mocks.revokeAllOrganizationUserSessions,
  revokeUserInvitation: mocks.revokeUserInvitation
}));

import {
  changeUserRoleAction,
  disableUserAction,
  inviteUserAction,
  revokeUserSessionsAction
} from "@/app/app/settings/users/actions";

const context = {
  userId: "owner-1",
  organizationId: "org-from-session",
  role: UserRole.OWNER
};
const now = new Date("2026-07-27T12:00:00.000Z");
const rawToken = "a".repeat(43);
const setupPath = `/setup-account/${rawToken}`;
const managedUser = {
  id: "user-2",
  name: "Ana",
  email: "ana@example.com",
  role: UserRole.TECHNICIAN,
  roleLabel: "Tecnico",
  status: "INVITED",
  statusLabel: "Convite pendente",
  disabledAt: null,
  createdAt: now,
  isCurrentUser: false,
  invitation: null
};

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("user management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedContext.mockResolvedValue(context);
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("reauthorizes invite server-side, ignores browser tenant fields and never audits the raw token", async () => {
    mocks.inviteOrganizationUser.mockResolvedValueOnce({
      user: managedUser,
      setupPath,
      expiresAt: new Date("2026-07-30T12:00:00.000Z")
    });

    const result = await inviteUserAction(
      {},
      createFormData({
        name: "Ana",
        email: "ana@example.com",
        role: UserRole.TECHNICIAN,
        organizationId: "org-from-browser",
        password: "temporary-password",
        token: "browser-token"
      })
    );

    expect(mocks.requireAuthenticatedContext).toHaveBeenCalledTimes(1);
    expect(mocks.inviteOrganizationUser).toHaveBeenCalledWith(context, {
      name: "Ana",
      email: "ana@example.com",
      role: UserRole.TECHNICIAN
    });
    expect(result.setupPath).toBe(setupPath);
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "USER_INVITED",
        outcome: "SUCCESS",
        organizationId: "org-from-session",
        userId: "owner-1"
      })
    );
    const auditPayload = JSON.stringify(
      mocks.recordSecurityAuditEvent.mock.calls
    );
    expect(auditPayload).not.toContain(rawToken);
    expect(auditPayload).not.toContain("temporary-password");
    expect(auditPayload).not.toContain("browser-token");
  });

  it("records a refused direct ADMIN operation", async () => {
    mocks.requireAuthenticatedContext.mockResolvedValueOnce({
      ...context,
      role: UserRole.ADMIN
    });
    mocks.changeUserRole.mockRejectedValueOnce(new AuthorizationError());

    await expect(
      changeUserRoleAction(
        "user-2",
        {},
        createFormData({
          role: UserRole.ADMIN,
          organizationId: "org-from-browser"
        })
      )
    ).resolves.toEqual({
      error: "Permissao insuficiente."
    });

    expect(mocks.changeUserRole).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-from-session",
        role: UserRole.ADMIN
      }),
      "user-2",
      UserRole.ADMIN
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "USER_ADMIN_OPERATION_REJECTED",
        outcome: "BLOCKED",
        metadata: {
          operation: "change_role",
          reason: "AuthorizationError"
        }
      })
    );
  });

  it("returns NotFound and performs no cross-tenant mutation when service rejects the id", async () => {
    mocks.changeUserRole.mockRejectedValueOnce(
      new NotFoundError("Usuario nao encontrado.")
    );

    await expect(
      changeUserRoleAction(
        "valid-user-id-from-org-2",
        {},
        createFormData({
          role: UserRole.ADMIN
        })
      )
    ).resolves.toEqual({
      error: "Usuario nao encontrado."
    });
  });

  it("audits user disablement and automatic session revocation without secrets", async () => {
    mocks.disableOrganizationUser.mockResolvedValueOnce({
      user: {
        ...managedUser,
        status: "DISABLED",
        statusLabel: "Desativado",
        disabledAt: now
      },
      changed: true,
      revokedSessionCount: 2,
      revokedInvitationCount: 1
    });

    await expect(
      disableUserAction("user-2", {}, createFormData({}))
    ).resolves.toEqual({
      success: "Usuario desativado e sessoes revogadas."
    });

    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "USER_DISABLED"
      })
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "USER_SESSIONS_REVOKED",
        metadata: {
          revokedCount: 2,
          reason: "user_disabled"
        }
      })
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "USER_INVITATION_REVOKED"
      })
    );
  });

  it("revokes every session for the tenant-scoped target", async () => {
    mocks.revokeAllOrganizationUserSessions.mockResolvedValueOnce({
      user: managedUser,
      changed: true,
      revokedSessionCount: 3,
      revokedInvitationCount: 0
    });

    await expect(
      revokeUserSessionsAction("user-2", {}, createFormData({}))
    ).resolves.toEqual({
      success: "3 sessao(oes) revogada(s)."
    });
    expect(mocks.revokeAllOrganizationUserSessions).toHaveBeenCalledWith(
      context,
      "user-2"
    );
  });
});
