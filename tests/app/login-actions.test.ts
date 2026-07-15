import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  INVALID_CREDENTIALS_MESSAGE
} from "@/domain/errors/authentication-error";
import { RateLimitExceededError } from "@/server/security/rate-limit-types";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  cookies: vi.fn(),
  loginWithEmailAndPassword: vi.fn(),
  enforceRateLimit: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  recordSecurityAuditEvent: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("@/server/auth/login-service", () => ({
  loginWithEmailAndPassword: mocks.loginWithEmailAndPassword
}));

vi.mock("@/server/security/rate-limit-service", () => ({
  enforceRateLimit: mocks.enforceRateLimit
}));

vi.mock("@/server/security/request-origin", () => ({
  getSecurityRequestOrigin: mocks.getSecurityRequestOrigin
}));

vi.mock("@/server/security/security-audit-service", () => ({
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent
}));

import { loginAction } from "@/app/login/actions";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("login action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
    mocks.cookies.mockResolvedValue({
      set: vi.fn()
    });
  });

  it("applies rate limit before authenticating and records successful login", async () => {
    mocks.loginWithEmailAndPassword.mockResolvedValueOnce({
      sessionToken: "raw-session-token",
      expiresAt: new Date("2026-07-14T12:00:00.000Z"),
      user: {
        id: "user-1",
        organizationId: "org-1",
        name: "Owner",
        email: "owner@example.com",
        role: "OWNER"
      }
    });

    await expect(
      loginAction(
        {},
        createFormData({
          email: "owner@example.com",
          password: "valid-password-123"
        })
      )
    ).rejects.toThrow("redirect:/app");

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "LOGIN_ATTEMPT",
        origin: {
          originHash: "origin-hash"
        }
      })
    );
    expect(mocks.loginWithEmailAndPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "valid-password-123"
    });
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LOGIN_SUCCEEDED",
        outcome: "SUCCESS",
        organizationId: "org-1",
        userId: "user-1",
        originHash: "origin-hash"
      })
    );
    expect(JSON.stringify(mocks.recordSecurityAuditEvent.mock.calls)).not.toContain(
      "raw-session-token"
    );
    expect(JSON.stringify(mocks.recordSecurityAuditEvent.mock.calls)).not.toContain(
      "valid-password-123"
    );
  });

  it("returns a generic rate limit message without authenticating", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new RateLimitExceededError());

    await expect(
      loginAction(
        {},
        createFormData({
          email: "owner@example.com",
          password: "valid-password-123"
        })
      )
    ).resolves.toEqual({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    });

    expect(mocks.loginWithEmailAndPassword).not.toHaveBeenCalled();
    expect(mocks.recordSecurityAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LOGIN_REJECTED"
      })
    );
  });

  it("keeps the same generic message for rejected credentials and audits safely", async () => {
    mocks.loginWithEmailAndPassword.mockRejectedValueOnce(
      new AuthenticationError(INVALID_CREDENTIALS_MESSAGE)
    );

    await expect(
      loginAction(
        {},
        createFormData({
          email: "missing@example.com",
          password: "valid-password-123"
        })
      )
    ).resolves.toEqual({
      error: INVALID_CREDENTIALS_MESSAGE
    });

    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LOGIN_REJECTED",
        outcome: "FAILURE",
        originHash: "origin-hash",
        metadata: {
          reason: "invalid_credentials"
        }
      })
    );
    expect(JSON.stringify(mocks.recordSecurityAuditEvent.mock.calls)).not.toContain(
      "missing@example.com"
    );
    expect(JSON.stringify(mocks.recordSecurityAuditEvent.mock.calls)).not.toContain(
      "valid-password-123"
    );
  });
});
