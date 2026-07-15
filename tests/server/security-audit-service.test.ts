import { describe, expect, it, vi } from "vitest";
import {
  recordSecurityAuditEvent,
  sanitizeSecurityAuditMetadata,
  type SecurityAuditServiceDependencies
} from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";
import type { SecurityRuntimeConfig } from "@/server/security/security-env";

const config: SecurityRuntimeConfig = {
  appEnvironment: "test",
  rateLimit: {
    store: "memory",
    policies: {
      LOGIN_ATTEMPT: {
        limit: 5,
        windowSeconds: 300
      },
      PUBLIC_PORTAL_LOOKUP: {
        limit: 60,
        windowSeconds: 60
      },
      PUBLIC_QUOTE_APPROVE: {
        limit: 5,
        windowSeconds: 300
      },
      PUBLIC_QUOTE_REJECT: {
        limit: 5,
        windowSeconds: 300
      }
    }
  },
  audit: {
    enabled: true,
    store: "database"
  }
};

function createDependencies(
  overrides: Partial<SecurityAuditServiceDependencies> = {}
): SecurityAuditServiceDependencies {
  return {
    createSecurityAuditLog: vi.fn(async () => undefined),
    getConfig: () => config,
    reportError: vi.fn(),
    ...overrides
  };
}

describe("security audit service", () => {
  it("removes forbidden metadata keys before writing audit logs", () => {
    expect(
      sanitizeSecurityAuditMetadata({
        password: "secret",
        passwordHash: "hash",
        cookie: "cookie",
        token: "raw-session-token",
        tokenHash: "token-hash",
        publicCode: "FF-ABCDEFG234",
        safeReason: "invalid_credentials"
      })
    ).toEqual({
      safeReason: "invalid_credentials"
    });
  });

  it("records security events without password, session token or raw publicCode", async () => {
    const dependencies = createDependencies();

    await recordSecurityAuditEvent(
      {
        eventType: securityAuditEventTypes.loginRejected,
        outcome: securityAuditOutcomes.failure,
        subjectHash: "email-hash",
        originHash: "origin-hash",
        metadata: {
          reason: "invalid_credentials",
          password: "valid-password-123",
          token: "raw-session-token",
          publicCode: "FF-ABCDEFG234"
        }
      },
      dependencies
    );

    const writtenInput = vi.mocked(dependencies.createSecurityAuditLog).mock
      .calls[0][0];

    expect(writtenInput).toMatchObject({
      eventType: securityAuditEventTypes.loginRejected,
      outcome: securityAuditOutcomes.failure,
      subjectHash: "email-hash",
      originHash: "origin-hash",
      metadata: {
        reason: "invalid_credentials"
      }
    });
    expect(JSON.stringify(writtenInput)).not.toContain("valid-password-123");
    expect(JSON.stringify(writtenInput)).not.toContain("raw-session-token");
    expect(JSON.stringify(writtenInput)).not.toContain("FF-ABCDEFG234");
  });

  it("does not block the primary operation when audit writing fails", async () => {
    const dependencies = createDependencies({
      createSecurityAuditLog: vi.fn(async () => {
        throw new Error("audit table unavailable");
      })
    });

    await expect(
      recordSecurityAuditEvent(
        {
          eventType: securityAuditEventTypes.logout,
          outcome: securityAuditOutcomes.success,
          userId: "user-1",
          organizationId: "org-1"
        },
        dependencies
      )
    ).resolves.toBeUndefined();
    expect(dependencies.reportError).toHaveBeenCalledWith(
      "Security audit log write failed.",
      expect.objectContaining({
        eventType: securityAuditEventTypes.logout,
        outcome: securityAuditOutcomes.success,
        errorName: "Error"
      })
    );
  });
});
