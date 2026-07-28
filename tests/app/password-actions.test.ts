import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/domain/errors/domain-error";
import { ValidationError } from "@/domain/errors/validation-error";
import { RateLimitExceededError } from "@/server/security/rate-limit-types";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  cookieSet: vi.fn(),
  cookies: vi.fn(),
  requireAuthenticatedContext: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  enforceRateLimit: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  changeOwnPassword: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
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

vi.mock("@/server/services/password-service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/server/services/password-service")>();

  return {
    ...original,
    changeOwnPassword: mocks.changeOwnPassword
  };
});

import { changeOwnPasswordAction } from "@/app/app/settings/account/actions";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("password change action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedContext.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      role: "TECHNICIAN"
    });
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
    mocks.cookies.mockResolvedValue({
      set: mocks.cookieSet
    });
  });

  it("rate limits by authenticated user, changes the password and expires the current cookie", async () => {
    mocks.changeOwnPassword.mockResolvedValueOnce({
      userId: "user-1",
      organizationId: "org-1",
      revokedSessionCount: 3
    });

    const result = await changeOwnPasswordAction(
      {},
      createFormData({
        currentPassword: "current-password-123",
        newPassword: "different-password-456",
        newPasswordConfirmation: "different-password-456",
        organizationId: "org-from-browser"
      })
    );

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "PASSWORD_CHANGE_ATTEMPT",
        origin: {
          originHash: "origin-hash"
        }
      })
    );
    expect(mocks.changeOwnPassword).toHaveBeenCalledWith(
      {
        userId: "user-1",
        organizationId: "org-1",
        role: "TECHNICIAN"
      },
      {
        currentPassword: "current-password-123",
        newPassword: "different-password-456",
        newPasswordConfirmation: "different-password-456"
      }
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_CHANGED",
        outcome: "SUCCESS",
        userId: "user-1",
        organizationId: "org-1",
        metadata: {
          revokedCount: 3
        }
      })
    );
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "fixflow_session",
      "",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax"
      })
    );
    expect(result.success).toContain("entre novamente");
    const serializedAudit = JSON.stringify(
      mocks.recordSecurityAuditEvent.mock.calls
    );
    expect(serializedAudit).not.toContain("current-password-123");
    expect(serializedAudit).not.toContain("different-password-456");
  });

  it("returns safe current-password and validation failures without auditing secrets", async () => {
    mocks.changeOwnPassword
      .mockRejectedValueOnce(
        new DomainError(
          "Nao foi possivel alterar a senha. Confira a senha atual e tente novamente."
        )
      )
      .mockRejectedValueOnce(
        new ValidationError("Senha invalida.", {
          newPassword: "Senha invalida."
        })
      );

    await expect(
      changeOwnPasswordAction(
        {},
        createFormData({
          currentPassword: "wrong-password-123",
          newPassword: "different-password-456",
          newPasswordConfirmation: "different-password-456"
        })
      )
    ).resolves.toEqual({
      error:
        "Nao foi possivel alterar a senha. Confira a senha atual e tente novamente."
    });

    await expect(
      changeOwnPasswordAction(
        {},
        createFormData({
          currentPassword: "current-password-123",
          newPassword: "short",
          newPasswordConfirmation: "short"
        })
      )
    ).resolves.toEqual({
      error: "Senha invalida.",
      fieldErrors: {
        newPassword: "Senha invalida."
      }
    });
    expect(mocks.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("stops before password verification when rate limited", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new RateLimitExceededError());

    await expect(
      changeOwnPasswordAction(
        {},
        createFormData({
          currentPassword: "current-password-123",
          newPassword: "different-password-456",
          newPasswordConfirmation: "different-password-456"
        })
      )
    ).resolves.toEqual({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    });
    expect(mocks.changeOwnPassword).not.toHaveBeenCalled();
  });
});
