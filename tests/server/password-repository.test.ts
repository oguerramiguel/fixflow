import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    updateMany: vi.fn()
  },
  authSession: {
    deleteMany: vi.fn()
  },
  passwordResetToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn()
  },
  queryRaw: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: mocks.user,
    authSession: mocks.authSession,
    passwordResetToken: mocks.passwordResetToken,
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction
  }
}));

import {
  changeOwnPasswordAndRevokeSessions,
  consumePasswordReset,
  createPasswordResetForUser,
  findOwnPasswordCredential
} from "@/server/repositories/password-repository";

const context: TenantContext = {
  organizationId: "org-1"
};
const now = new Date("2026-07-28T12:00:00.000Z");

describe("password repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: mocks.user,
        authSession: mocks.authSession,
        passwordResetToken: mocks.passwordResetToken,
        $queryRaw: mocks.queryRaw
      })
    );
  });

  it("loads the current password only for the active user inside the trusted tenant", async () => {
    mocks.user.findFirst.mockResolvedValueOnce({
      id: "user-1",
      organizationId: "org-1",
      passwordHash: "stored-password-hash"
    });

    await findOwnPasswordCredential(context, "user-1");

    expect(mocks.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        organizationId: "org-1",
        disabledAt: null,
        passwordHash: {
          not: null
        }
      },
      select: {
        id: true,
        organizationId: true,
        passwordHash: true
      }
    });
  });

  it("updates by expected hash and revokes all sessions in one transaction", async () => {
    mocks.user.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.authSession.deleteMany.mockResolvedValueOnce({
      count: 3
    });

    const result = await changeOwnPasswordAndRevokeSessions(
      context,
      "user-1",
      "expected-password-hash",
      "new-password-hash"
    );

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        organizationId: "org-1",
        passwordHash: "expected-password-hash",
        disabledAt: null
      },
      data: {
        passwordHash: "new-password-hash"
      }
    });
    expect(mocks.authSession.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1"
      }
    });
    expect(result?.revokedSessionCount).toBe(3);
  });

  it("locks a tenant target, revokes previous pending tokens and stores only the new hash", async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      {
        id: "user-2",
        passwordHash: "stored-password-hash",
        disabledAt: null
      }
    ]);
    mocks.passwordResetToken.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.passwordResetToken.create.mockResolvedValueOnce({
      id: "reset-2"
    });

    const result = await createPasswordResetForUser(context, {
      createdByUserId: "owner-1",
      userId: "user-2",
      tokenHash: "new-token-hash",
      expiresAt: new Date("2026-07-28T12:30:00.000Z"),
      now
    });

    expect(mocks.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        userId: "user-2",
        usedAt: null,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });
    expect(mocks.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "user-2",
        createdByUserId: "owner-1",
        tokenHash: "new-token-hash",
        expiresAt: new Date("2026-07-28T12:30:00.000Z")
      },
      select: {
        id: true
      }
    });
    expect(result).toMatchObject({
      outcome: "created",
      revokedTokenCount: 1
    });
    expect(JSON.stringify(mocks.passwordResetToken.create.mock.calls)).not.toContain(
      "raw-password-reset-token"
    );
  });

  it("blocks cross-tenant, INVITED and DISABLED targets before token creation", async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "invited-1",
          passwordHash: null,
          disabledAt: null
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "disabled-1",
          passwordHash: "stored-password-hash",
          disabledAt: now
        }
      ]);

    await expect(
      createPasswordResetForUser(context, {
        createdByUserId: "owner-1",
        userId: "user-from-org-2",
        tokenHash: "hash-1",
        expiresAt: new Date("2026-07-28T12:30:00.000Z"),
        now
      })
    ).resolves.toEqual({
      outcome: "not_found"
    });
    await expect(
      createPasswordResetForUser(context, {
        createdByUserId: "owner-1",
        userId: "invited-1",
        tokenHash: "hash-2",
        expiresAt: new Date("2026-07-28T12:30:00.000Z"),
        now
      })
    ).resolves.toEqual({
      outcome: "unavailable"
    });
    await expect(
      createPasswordResetForUser(context, {
        createdByUserId: "owner-1",
        userId: "disabled-1",
        tokenHash: "hash-3",
        expiresAt: new Date("2026-07-28T12:30:00.000Z"),
        now
      })
    ).resolves.toEqual({
      outcome: "unavailable"
    });
    expect(mocks.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("claims once, updates the tenant user, revokes sessions and closes other resets atomically", async () => {
    mocks.passwordResetToken.findUnique.mockResolvedValueOnce({
      id: "reset-1",
      organizationId: "org-1",
      userId: "user-2"
    });
    mocks.queryRaw.mockResolvedValueOnce([
      {
        id: "user-2",
        passwordHash: "stored-password-hash",
        disabledAt: null
      }
    ]);
    mocks.passwordResetToken.updateMany
      .mockResolvedValueOnce({
        count: 1
      })
      .mockResolvedValueOnce({
        count: 2
      });
    mocks.user.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.authSession.deleteMany.mockResolvedValueOnce({
      count: 4
    });

    const result = await consumePasswordReset(
      "token-hash",
      "new-password-hash",
      now
    );

    expect(mocks.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.passwordResetToken.updateMany.mock.invocationCallOrder[0]
    );
    expect(mocks.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "reset-1",
        organizationId: "org-1",
        userId: "user-2",
        tokenHash: "token-hash",
        usedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: now
        }
      },
      data: {
        usedAt: now
      }
    });
    expect(mocks.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "user-2",
          organizationId: "org-1",
          disabledAt: null
        }),
        data: {
          passwordHash: "new-password-hash"
        }
      })
    );
    expect(mocks.authSession.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-2"
      }
    });
    expect(result).toEqual({
      organizationId: "org-1",
      userId: "user-2",
      revokedSessionCount: 4,
      revokedTokenCount: 2
    });
  });

  it("allows only one concurrent claim of an expired, revoked, used or raced token", async () => {
    mocks.passwordResetToken.findUnique
      .mockResolvedValueOnce({
        id: "reset-1",
        organizationId: "org-1",
        userId: "user-2"
      })
      .mockResolvedValueOnce({
        id: "reset-1",
        organizationId: "org-1",
        userId: "user-2"
      });
    mocks.queryRaw
      .mockResolvedValueOnce([
        {
          id: "user-2",
          passwordHash: "stored-password-hash",
          disabledAt: null
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "user-2",
          passwordHash: "stored-password-hash",
          disabledAt: null
        }
      ]);
    mocks.passwordResetToken.updateMany
      .mockResolvedValueOnce({
        count: 1
      })
      .mockResolvedValueOnce({
        count: 0
      });
    mocks.user.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.authSession.deleteMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.passwordResetToken.updateMany.mockResolvedValueOnce({
      count: 0
    });

    const results = await Promise.all([
      consumePasswordReset("token-hash", "password-hash-1", now),
      consumePasswordReset("token-hash", "password-hash-2", now)
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(mocks.user.updateMany).toHaveBeenCalledTimes(1);
  });
});
