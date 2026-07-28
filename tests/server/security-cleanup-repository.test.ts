import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authSession: {
    count: vi.fn()
  },
  userInvitation: {
    count: vi.fn()
  },
  passwordResetToken: {
    count: vi.fn()
  },
  rateLimitCounter: {
    count: vi.fn()
  },
  securityAuditLog: {
    count: vi.fn()
  },
  queryRaw: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    authSession: mocks.authSession,
    userInvitation: mocks.userInvitation,
    passwordResetToken: mocks.passwordResetToken,
    rateLimitCounter: mocks.rateLimitCounter,
    securityAuditLog: mocks.securityAuditLog,
    $queryRaw: mocks.queryRaw
  }
}));

import {
  countEligibleSecurityRecords,
  deleteEligibleSecurityRecordBatch,
  type SecurityCleanupCutoffs
} from "@/server/security/security-cleanup-repository";

const cutoff = new Date("2026-07-01T00:00:00.000Z");
const cutoffs: SecurityCleanupCutoffs = {
  authSessions: cutoff,
  userInvitations: cutoff,
  passwordResetTokens: cutoff,
  rateLimitCounters: cutoff,
  securityAuditLogs: cutoff
};

describe("security cleanup repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession.count.mockResolvedValue(1);
    mocks.userInvitation.count.mockResolvedValue(2);
    mocks.passwordResetToken.count.mockResolvedValue(3);
    mocks.rateLimitCounter.count.mockResolvedValue(4);
    mocks.securityAuditLog.count.mockResolvedValue(5);
    mocks.queryRaw.mockResolvedValue([]);
  });

  it("counts only records older than the retention cutoffs for dry-run", async () => {
    await expect(countEligibleSecurityRecords(cutoffs)).resolves.toEqual({
      authSessions: 1,
      userInvitations: 2,
      passwordResetTokens: 3,
      rateLimitCounters: 4,
      securityAuditLogs: 5
    });
    expect(mocks.authSession.count).toHaveBeenCalledWith({
      where: {
        expiresAt: {
          lte: cutoff
        }
      }
    });
    expect(mocks.userInvitation.count).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            usedAt: {
              lte: cutoff
            }
          },
          {
            revokedAt: {
              lte: cutoff
            }
          },
          {
            expiresAt: {
              lte: cutoff
            }
          }
        ]
      }
    });
  });

  it("uses bounded SKIP LOCKED deletes only against security tables", async () => {
    for (const recordType of [
      "authSessions",
      "userInvitations",
      "passwordResetTokens",
      "rateLimitCounters",
      "securityAuditLogs"
    ] as const) {
      await deleteEligibleSecurityRecordBatch(recordType, cutoff, 500);
    }

    const sql = mocks.queryRaw.mock.calls
      .map((call) => [...call[0]].join(""))
      .join("\n");

    expect(sql).toContain('DELETE FROM "AuthSession"');
    expect(sql).toContain('DELETE FROM "UserInvitation"');
    expect(sql).toContain('DELETE FROM "PasswordResetToken"');
    expect(sql).toContain('DELETE FROM "RateLimitCounter"');
    expect(sql).toContain('DELETE FROM "SecurityAuditLog"');
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).not.toContain('DELETE FROM "User"');
    expect(sql).not.toContain('DELETE FROM "Organization"');
    expect(sql).not.toContain('DELETE FROM "Customer"');
    expect(sql).not.toContain('DELETE FROM "Equipment"');
    expect(sql).not.toContain('DELETE FROM "ServiceOrder"');
  });
});
