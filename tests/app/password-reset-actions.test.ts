import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/errors/validation-error";
import { RateLimitExceededError } from "@/server/security/rate-limit-types";

const mocks = vi.hoisted(() => ({
  completePasswordReset: vi.fn(),
  enforceRateLimit: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  recordSecurityAuditEvent: vi.fn()
}));

vi.mock("@/server/services/password-reset-service", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/server/services/password-reset-service")
    >();

  return {
    ...original,
    completePasswordReset: mocks.completePasswordReset
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

import { completePasswordResetAction } from "@/app/reset-password/[token]/actions";

const rawToken = "a".repeat(43);

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("password reset action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("consumes under its own rate limit and audits completion without token or password", async () => {
    mocks.completePasswordReset.mockResolvedValueOnce({
      organizationId: "org-1",
      userId: "user-2",
      revokedSessionCount: 2,
      revokedTokenCount: 1
    });

    const result = await completePasswordResetAction(
      rawToken,
      {},
      createFormData({
        password: "new-password-456",
        passwordConfirmation: "new-password-456"
      })
    );

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "PASSWORD_RESET_CONSUME",
        keyParts: [],
        origin: {
          originHash: "origin-hash"
        }
      })
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_COMPLETED",
        outcome: "SUCCESS",
        organizationId: "org-1",
        userId: "user-2"
      })
    );
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_TOKEN_REVOKED"
      })
    );
    expect(result.success).toContain("sessoes anteriores");
    const auditPayload = JSON.stringify(
      mocks.recordSecurityAuditEvent.mock.calls
    );
    expect(auditPayload).not.toContain(rawToken);
    expect(auditPayload).not.toContain("new-password-456");
  });

  it("uses one generic rejection for invalid, expired, revoked and used tokens", async () => {
    mocks.completePasswordReset.mockResolvedValueOnce(null);

    await expect(
      completePasswordResetAction(
        rawToken,
        {},
        createFormData({
          password: "new-password-456",
          passwordConfirmation: "new-password-456"
        })
      )
    ).resolves.toEqual({
      error:
        "Este link de redefinicao nao e valido ou nao esta mais disponivel."
    });
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_REJECTED",
        outcome: "FAILURE",
        metadata: {
          reason: "unavailable"
        }
      })
    );
  });

  it("returns validation feedback and stops entirely when rate limited", async () => {
    mocks.completePasswordReset
      .mockRejectedValueOnce(
        new ValidationError("Senha invalida.", {
          password: "Senha invalida."
        })
      )
      .mockResolvedValueOnce(null);

    await expect(
      completePasswordResetAction(
        rawToken,
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

    mocks.enforceRateLimit.mockRejectedValueOnce(new RateLimitExceededError());

    await expect(
      completePasswordResetAction(
        rawToken,
        {},
        createFormData({
          password: "new-password-456",
          passwordConfirmation: "new-password-456"
        })
      )
    ).resolves.toEqual({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    });
    expect(mocks.completePasswordReset).toHaveBeenCalledTimes(1);
  });
});
