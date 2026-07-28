import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { RateLimitExceededError } from "@/server/security/rate-limit-types";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  revalidatePath: vi.fn(),
  requireAuthenticatedContext: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  enforceRateLimit: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  createPasswordResetLink: vi.fn(),
  revokePasswordResetLinks: vi.fn(),
  userManagementOperation: vi.fn()
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

vi.mock("@/server/security/rate-limit-service", () => ({
  enforceRateLimit: mocks.enforceRateLimit
}));

vi.mock("@/server/security/security-audit-service", () => ({
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent
}));

vi.mock("@/server/services/password-reset-service", () => ({
  createPasswordResetLink: mocks.createPasswordResetLink,
  revokePasswordResetLinks: mocks.revokePasswordResetLinks
}));

vi.mock("@/server/services/user-management-service", () => ({
  changeUserRole: mocks.userManagementOperation,
  disableOrganizationUser: mocks.userManagementOperation,
  inviteOrganizationUser: mocks.userManagementOperation,
  reactivateOrganizationUser: mocks.userManagementOperation,
  reissueUserInvitation: mocks.userManagementOperation,
  revokeAllOrganizationUserSessions: mocks.userManagementOperation,
  revokeUserInvitation: mocks.userManagementOperation
}));

import {
  createPasswordResetLinkAction,
  revokePasswordResetLinksAction
} from "@/app/app/settings/users/actions";

const context = {
  userId: "owner-1",
  organizationId: "org-1",
  role: UserRole.OWNER
};
const rawToken = "a".repeat(43);

describe("assisted password reset admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedContext.mockResolvedValue(context);
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("rate limits the OWNER operation and returns the raw link only in the original response", async () => {
    mocks.createPasswordResetLink.mockResolvedValueOnce({
      userId: "user-2",
      resetPath: `/reset-password/${rawToken}`,
      expiresAt: new Date("2026-07-28T12:30:00.000Z"),
      revokedTokenCount: 1
    });

    const formData = new FormData();
    formData.set("organizationId", "org-from-browser");
    formData.set("token", "browser-token");
    const result = await createPasswordResetLinkAction("user-2", {}, formData);

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "PASSWORD_RESET_CREATE",
        origin: {
          originHash: "origin-hash"
        }
      })
    );
    expect(mocks.createPasswordResetLink).toHaveBeenCalledWith(
      context,
      "user-2"
    );
    expect(result.passwordResetPath).toBe(`/reset-password/${rawToken}`);
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_CREATED",
        outcome: "SUCCESS",
        organizationId: "org-1",
        userId: "owner-1"
      })
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_TOKEN_REVOKED",
        metadata: {
          reason: "replaced",
          revokedCount: 1
        }
      })
    );
    const auditPayload = JSON.stringify(
      mocks.recordSecurityAuditEvent.mock.calls
    );
    expect(auditPayload).not.toContain(rawToken);
    expect(auditPayload).not.toContain("browser-token");
  });

  it.each([UserRole.ADMIN, UserRole.TECHNICIAN])(
    "returns a server-side authorization failure for %s",
    async (role) => {
      mocks.requireAuthenticatedContext.mockResolvedValueOnce({
        ...context,
        role
      });
      mocks.createPasswordResetLink.mockRejectedValueOnce(
        new AuthorizationError()
      );

      await expect(
        createPasswordResetLinkAction("user-2", {}, new FormData())
      ).resolves.toEqual({
        error: "Permissao insuficiente."
      });
    }
  );

  it("stops before creating a link when the administrative rate limit blocks", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new RateLimitExceededError());

    await expect(
      createPasswordResetLinkAction("user-2", {}, new FormData())
    ).resolves.toEqual({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    });
    expect(mocks.createPasswordResetLink).not.toHaveBeenCalled();
  });

  it("revokes pending links explicitly and audits only when a record changed", async () => {
    mocks.revokePasswordResetLinks.mockResolvedValueOnce({
      userId: "user-2",
      revokedTokenCount: 1
    });

    await expect(
      revokePasswordResetLinksAction("user-2", {}, new FormData())
    ).resolves.toEqual({
      success: "Link de redefinicao revogado."
    });
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_TOKEN_REVOKED",
        metadata: {
          reason: "owner_requested",
          revokedCount: 1
        }
      })
    );
  });
});
