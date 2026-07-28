import { describe, expect, it, vi } from "vitest";
import type {
  SecurityCleanupCounts,
  SecurityCleanupRecordType
} from "@/server/security/security-cleanup-repository";
import {
  runSecurityCleanup,
  type SecurityCleanupServiceDependencies
} from "@/server/security/security-cleanup-service";
import type { SecurityRuntimeConfig } from "@/server/security/security-env";

const now = new Date("2026-07-28T12:00:00.000Z");
const eligibleCounts: SecurityCleanupCounts = {
  authSessions: 2,
  userInvitations: 3,
  passwordResetTokens: 4,
  rateLimitCounters: 5,
  securityAuditLogs: 6
};

const config: SecurityRuntimeConfig = {
  appEnvironment: "test",
  passwordReset: {
    tokenTtlMinutes: 30
  },
  rateLimit: {
    store: "memory",
    policies: {
      LOGIN_ATTEMPT: { limit: 5, windowSeconds: 300 },
      ACCOUNT_SETUP_ATTEMPT: { limit: 5, windowSeconds: 300 },
      PASSWORD_CHANGE_ATTEMPT: { limit: 5, windowSeconds: 300 },
      PASSWORD_RESET_CREATE: { limit: 5, windowSeconds: 900 },
      PASSWORD_RESET_CONSUME: { limit: 5, windowSeconds: 300 },
      PUBLIC_PORTAL_LOOKUP: { limit: 60, windowSeconds: 60 },
      PUBLIC_QUOTE_APPROVE: { limit: 5, windowSeconds: 300 },
      PUBLIC_QUOTE_REJECT: { limit: 5, windowSeconds: 300 }
    }
  },
  audit: {
    enabled: true,
    store: "database"
  },
  retention: {
    expiredSessionDays: 7,
    closedInvitationDays: 30,
    closedPasswordResetDays: 30,
    rateLimitCounterSeconds: 86400,
    auditLogDays: 90
  },
  cleanup: {
    batchSize: 2
  }
};

function createDependencies(
  overrides: Partial<SecurityCleanupServiceDependencies> = {}
): SecurityCleanupServiceDependencies {
  return {
    getConfig: () => config,
    countEligibleRecords: vi.fn(async () => eligibleCounts),
    deleteEligibleBatch: vi.fn(async () => 0),
    recordAuditEvent: vi.fn(async () => undefined),
    ...overrides
  };
}

describe("security cleanup service", () => {
  it("returns dry-run counts and never deletes records", async () => {
    const dependencies = createDependencies();
    const result = await runSecurityCleanup(
      {
        dryRun: true,
        now
      },
      dependencies
    );

    expect(result).toMatchObject({
      dryRun: true,
      batchSize: 2,
      counts: eligibleCounts
    });
    expect(result.cutoffs).toEqual({
      authSessions: new Date("2026-07-21T12:00:00.000Z"),
      userInvitations: new Date("2026-06-28T12:00:00.000Z"),
      passwordResetTokens: new Date("2026-06-28T12:00:00.000Z"),
      rateLimitCounters: new Date("2026-07-27T12:00:00.000Z"),
      securityAuditLogs: new Date("2026-04-29T12:00:00.000Z")
    });
    expect(dependencies.deleteEligibleBatch).not.toHaveBeenCalled();
  });

  it("deletes every category in bounded batches and is idempotent when rerun", async () => {
    const firstBatchByType = new Set<SecurityCleanupRecordType>();
    const deleteEligibleBatch = vi.fn(
      async (recordType: SecurityCleanupRecordType) => {
        if (!firstBatchByType.has(recordType)) {
          firstBatchByType.add(recordType);
          return 2;
        }

        return 0;
      }
    );
    const dependencies = createDependencies({
      deleteEligibleBatch
    });

    const first = await runSecurityCleanup(
      {
        dryRun: false,
        now
      },
      dependencies
    );
    const second = await runSecurityCleanup(
      {
        dryRun: false,
        now
      },
      dependencies
    );

    expect(first.counts).toEqual({
      authSessions: 2,
      userInvitations: 2,
      passwordResetTokens: 2,
      rateLimitCounters: 2,
      securityAuditLogs: 2
    });
    expect(second.counts).toEqual({
      authSessions: 0,
      userInvitations: 0,
      passwordResetTokens: 0,
      rateLimitCounters: 0,
      securityAuditLogs: 0
    });
    expect(dependencies.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SECURITY_CLEANUP_EXECUTED",
        outcome: "SUCCESS",
        metadata: expect.objectContaining({
          dryRun: false
        })
      })
    );
  });

  it("audits a minimized failure and propagates it to the operator", async () => {
    const dependencies = createDependencies({
      deleteEligibleBatch: vi.fn(async () => {
        throw new Error("database unavailable");
      })
    });

    await expect(
      runSecurityCleanup(
        {
          dryRun: false,
          now
        },
        dependencies
      )
    ).rejects.toThrow("database unavailable");
    expect(dependencies.recordAuditEvent).toHaveBeenCalledWith({
      eventType: "SECURITY_CLEANUP_EXECUTED",
      outcome: "FAILURE",
      metadata: {
        dryRun: false,
        errorName: "Error"
      }
    });
  });
});
