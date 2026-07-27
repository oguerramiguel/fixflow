import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/errors/validation-error";
import { RateLimitExceededError } from "@/server/security/rate-limit-types";

const mocks = vi.hoisted(() => ({
  completeAccountSetup: vi.fn(),
  enforceRateLimit: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  recordSecurityAuditEvent: vi.fn()
}));

vi.mock("@/server/services/account-setup-service", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/server/services/account-setup-service")
    >();

  return {
    ...original,
    completeAccountSetup: mocks.completeAccountSetup
  };
});

vi.mock("@/server/security/rate-limit-service", () => ({
  enforceRateLimit: mocks.enforceRateLimit
}));

vi.mock("@/server/security/request-origin", () => ({
  getSecurityRequestOrigin: mocks.getSecurityRequestOrigin
}));

vi.mock("@/server/security/security-audit-service", () => ({
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent
}));

import { completeAccountSetupAction } from "@/app/setup-account/[token]/actions";

const token = "a".repeat(43);

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("account setup action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("rate limits before consuming and audits success without token or password", async () => {
    mocks.completeAccountSetup.mockResolvedValueOnce({
      organizationId: "org-1",
      userId: "user-1",
      role: UserRole.TECHNICIAN
    });

    await expect(
      completeAccountSetupAction(
        token,
        {},
        createFormData({
          password: "valid-password-123",
          passwordConfirmation: "valid-password-123"
        })
      )
    ).resolves.toEqual({
      success: "Conta configurada com sucesso. Voce ja pode entrar no FixFlow."
    });

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "ACCOUNT_SETUP_ATTEMPT",
        origin: {
          originHash: "origin-hash"
        }
      })
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "USER_INVITATION_USED",
        outcome: "SUCCESS",
        organizationId: "org-1",
        userId: "user-1"
      })
    );
    const auditPayload = JSON.stringify(
      mocks.recordSecurityAuditEvent.mock.calls
    );
    expect(auditPayload).not.toContain(token);
    expect(auditPayload).not.toContain("valid-password-123");
  });

  it("uses the same generic message for invalid, expired, revoked or used tokens", async () => {
    mocks.completeAccountSetup.mockResolvedValueOnce(null);

    await expect(
      completeAccountSetupAction(
        token,
        {},
        createFormData({
          password: "valid-password-123",
          passwordConfirmation: "valid-password-123"
        })
      )
    ).resolves.toEqual({
      error:
        "Este link de configuracao nao e valido ou nao esta mais disponivel."
    });
    expect(mocks.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("returns password field errors without auditing secrets", async () => {
    mocks.completeAccountSetup.mockRejectedValueOnce(
      new ValidationError("Senha invalida.", {
        password: "Senha invalida."
      })
    );

    await expect(
      completeAccountSetupAction(
        token,
        {},
        createFormData({
          password: "short",
          passwordConfirmation: "short"
        })
      )
    ).resolves.toEqual({
      error: "Senha invalida.",
      fieldErrors: {
        password: "Senha invalida."
      }
    });
    expect(mocks.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("stops before token consumption when rate limited", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new RateLimitExceededError());

    await expect(
      completeAccountSetupAction(
        token,
        {},
        createFormData({
          password: "valid-password-123",
          passwordConfirmation: "valid-password-123"
        })
      )
    ).resolves.toEqual({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    });
    expect(mocks.completeAccountSetup).not.toHaveBeenCalled();
  });
});
