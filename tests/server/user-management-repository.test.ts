import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  userInvitation: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn()
  },
  authSession: {
    deleteMany: vi.fn()
  },
  queryRaw: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: mocks.user,
    userInvitation: mocks.userInvitation,
    authSession: mocks.authSession,
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction
  }
}));

import {
  changeOrganizationUserRole,
  consumeAccountSetupInvitation,
  createInvitedUserWithInvitation,
  listOrganizationUsers,
  replaceOrganizationUserInvitation,
  revokeOrganizationUserSessions,
  setOrganizationUserDisabled
} from "@/server/repositories/user-management-repository";

const context: TenantContext = {
  organizationId: "org-1"
};
const now = new Date("2026-07-27T12:00:00.000Z");
const expiresAt = new Date("2026-07-30T12:00:00.000Z");
const activeUser = {
  id: "user-1",
  name: "Owner",
  email: "owner@example.com",
  passwordHash: "stored-password-hash",
  role: UserRole.OWNER,
  disabledAt: null,
  createdAt: now,
  invitation: null
};
const pendingUser = {
  ...activeUser,
  id: "user-2",
  name: "Ana",
  email: "ana@example.com",
  passwordHash: null,
  role: UserRole.TECHNICIAN,
  invitation: {
    id: "invitation-1",
    expiresAt,
    usedAt: null,
    revokedAt: null,
    createdAt: now
  }
};

describe("user management repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockResolvedValue([{ id: "org-1" }]);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: mocks.user,
        userInvitation: mocks.userInvitation,
        authSession: mocks.authSession,
        $queryRaw: mocks.queryRaw
      })
    );
  });

  it("lists users only from the trusted organization", async () => {
    mocks.user.findMany.mockResolvedValueOnce([]);

    await listOrganizationUsers(context);

    expect(mocks.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1"
        }
      })
    );
  });

  it("creates the pending user and hashed invitation in one transaction", async () => {
    mocks.user.create.mockResolvedValueOnce({
      id: "user-2"
    });
    mocks.userInvitation.create.mockResolvedValueOnce({
      id: "invitation-1"
    });
    mocks.user.findFirst.mockResolvedValueOnce(pendingUser);

    await createInvitedUserWithInvitation(context, {
      name: "Ana",
      email: "ana@example.com",
      role: UserRole.TECHNICIAN,
      tokenHash: "token-hash",
      expiresAt
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: "org-1",
          name: "Ana",
          email: "ana@example.com",
          passwordHash: null,
          role: UserRole.TECHNICIAN,
          disabledAt: null
        }
      })
    );
    expect(mocks.userInvitation.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "user-2",
        tokenHash: "token-hash",
        expiresAt
      }
    });
    expect(JSON.stringify(mocks.userInvitation.create.mock.calls)).not.toContain(
      "raw-invitation-token"
    );
  });

  it("treats a valid user id from another tenant as not found", async () => {
    mocks.user.findFirst.mockResolvedValueOnce(null);

    const result = await changeOrganizationUserRole(
      context,
      "user-from-org-2",
      UserRole.ADMIN
    );

    expect(result).toEqual({
      outcome: "not_found"
    });
    expect(mocks.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "user-from-org-2",
          organizationId: "org-1"
        }
      })
    );
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("prevents demoting the last active OWNER while holding the organization lock", async () => {
    mocks.user.findFirst.mockResolvedValueOnce(activeUser);
    mocks.user.count.mockResolvedValueOnce(1);

    const result = await changeOrganizationUserRole(
      context,
      "user-1",
      UserRole.ADMIN
    );

    expect(result).toEqual({
      outcome: "last_active_owner"
    });
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.user.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        role: UserRole.OWNER,
        disabledAt: null,
        passwordHash: {
          not: null
        }
      }
    });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("changes an allowed role with id and organizationId", async () => {
    mocks.user.findFirst
      .mockResolvedValueOnce({
        ...activeUser,
        role: UserRole.TECHNICIAN
      })
      .mockResolvedValueOnce({
        ...activeUser,
        role: UserRole.ADMIN
      });
    mocks.user.update.mockResolvedValueOnce({
      id: "user-1"
    });

    await changeOrganizationUserRole(context, "user-1", UserRole.ADMIN);

    expect(mocks.user.update).toHaveBeenCalledWith({
      where: {
        id_organizationId: {
          id: "user-1",
          organizationId: "org-1"
        }
      },
      data: {
        role: UserRole.ADMIN
      }
    });
  });

  it("disables a user and revokes sessions and pending invitation atomically", async () => {
    mocks.user.findFirst
      .mockResolvedValueOnce({
        ...pendingUser,
        role: UserRole.ADMIN
      })
      .mockResolvedValueOnce({
        ...pendingUser,
        role: UserRole.ADMIN,
        disabledAt: now,
        invitation: {
          ...pendingUser.invitation,
          revokedAt: now
        }
      });
    mocks.user.update.mockResolvedValueOnce({
      id: "user-2"
    });
    mocks.authSession.deleteMany.mockResolvedValueOnce({
      count: 2
    });
    mocks.userInvitation.updateMany.mockResolvedValueOnce({
      count: 1
    });

    const result = await setOrganizationUserDisabled(
      context,
      "user-2",
      true,
      now
    );

    expect(mocks.authSession.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-2"
      }
    });
    expect(mocks.userInvitation.updateMany).toHaveBeenCalledWith({
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
    expect(result).toMatchObject({
      outcome: "updated",
      revokedSessionCount: 2,
      revokedInvitationCount: 1
    });
  });

  it("revokes sessions only after finding the target inside the tenant", async () => {
    mocks.user.findFirst.mockResolvedValueOnce(null);

    const result = await revokeOrganizationUserSessions(
      context,
      "user-from-org-2"
    );

    expect(result).toEqual({
      outcome: "not_found"
    });
    expect(mocks.authSession.deleteMany).not.toHaveBeenCalled();
  });

  it("does not replace a setup link while the current invitation is pending", async () => {
    mocks.user.findFirst.mockResolvedValueOnce(pendingUser);

    const result = await replaceOrganizationUserInvitation(
      context,
      "user-2",
      {
        tokenHash: "replacement-token-hash",
        expiresAt,
        now
      }
    );

    expect(result).toEqual({
      outcome: "invitation_unavailable"
    });
    expect(mocks.userInvitation.updateMany).not.toHaveBeenCalled();
  });

  it("replaces an expired setup link with a tenant-scoped conditional update", async () => {
    const expiredUser = {
      ...pendingUser,
      invitation: {
        ...pendingUser.invitation,
        expiresAt: new Date("2026-07-26T12:00:00.000Z")
      }
    };
    mocks.user.findFirst
      .mockResolvedValueOnce(expiredUser)
      .mockResolvedValueOnce({
        ...expiredUser,
        invitation: {
          ...expiredUser.invitation,
          expiresAt
        }
      });
    mocks.userInvitation.updateMany.mockResolvedValueOnce({
      count: 1
    });

    const result = await replaceOrganizationUserInvitation(
      context,
      "user-2",
      {
        tokenHash: "replacement-token-hash",
        expiresAt,
        now
      }
    );

    expect(mocks.userInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invitation-1",
        organizationId: "org-1",
        userId: "user-2",
        usedAt: null,
        OR: [
          {
            revokedAt: {
              not: null
            }
          },
          {
            expiresAt: {
              lte: now
            }
          }
        ]
      },
      data: {
        tokenHash: "replacement-token-hash",
        expiresAt,
        revokedAt: null,
        updatedAt: now
      }
    });
    expect(result).toMatchObject({
      outcome: "updated"
    });
  });

  it("consumes an available invitation with conditional claim and account update", async () => {
    mocks.userInvitation.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.userInvitation.findUnique.mockResolvedValueOnce({
      organizationId: "org-1",
      userId: "user-2"
    });
    mocks.user.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.user.findFirst.mockResolvedValueOnce({
      role: UserRole.TECHNICIAN
    });

    const result = await consumeAccountSetupInvitation(
      "token-hash",
      "new-password-hash",
      now
    );

    expect(mocks.userInvitation.updateMany).toHaveBeenCalledWith({
      where: {
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
    expect(mocks.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-2",
        organizationId: "org-1",
        passwordHash: null,
        disabledAt: null,
        organization: {
          is: {}
        }
      },
      data: {
        passwordHash: "new-password-hash"
      }
    });
    expect(result).toEqual({
      organizationId: "org-1",
      userId: "user-2",
      role: UserRole.TECHNICIAN
    });
  });

  it("rejects expired, revoked or already used invitations before user activation", async () => {
    mocks.userInvitation.updateMany.mockResolvedValueOnce({
      count: 0
    });

    await expect(
      consumeAccountSetupInvitation("token-hash", "new-password-hash", now)
    ).resolves.toBeNull();
    expect(mocks.user.updateMany).not.toHaveBeenCalled();
  });

  it("allows only one concurrent consumption of the same invitation", async () => {
    mocks.userInvitation.updateMany
      .mockResolvedValueOnce({
        count: 1
      })
      .mockResolvedValueOnce({
        count: 0
      });
    mocks.userInvitation.findUnique.mockResolvedValueOnce({
      organizationId: "org-1",
      userId: "user-2"
    });
    mocks.user.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.user.findFirst.mockResolvedValueOnce({
      role: UserRole.TECHNICIAN
    });

    const results = await Promise.all([
      consumeAccountSetupInvitation("token-hash", "password-hash-1", now),
      consumeAccountSetupInvitation("token-hash", "password-hash-2", now)
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(mocks.user.updateMany).toHaveBeenCalledTimes(1);
  });
});
