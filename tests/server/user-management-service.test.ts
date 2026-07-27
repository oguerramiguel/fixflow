import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  UserInvitationConflictError,
  type OrganizationUserRecord
} from "@/server/repositories/user-management-repository";
import {
  changeUserRole,
  disableOrganizationUser,
  inviteOrganizationUser,
  LAST_ACTIVE_OWNER_MESSAGE,
  listUsersForOrganization,
  reactivateOrganizationUser,
  reissueUserInvitation,
  revokeAllOrganizationUserSessions,
  revokeUserInvitation,
  type UserManagementServiceDependencies
} from "@/server/services/user-management-service";

const now = new Date("2026-07-27T12:00:00.000Z");
const expiresAt = new Date("2026-07-30T12:00:00.000Z");
const rawToken = "a".repeat(43);

const ownerContext: AuthenticatedContext = {
  userId: "owner-1",
  organizationId: "org-1",
  role: UserRole.OWNER
};

const pendingUser: OrganizationUserRecord = {
  id: "user-2",
  name: "Ana Tecnica",
  email: "ana@example.com",
  passwordHash: null,
  role: UserRole.TECHNICIAN,
  disabledAt: null,
  createdAt: now,
  invitation: {
    id: "invitation-1",
    expiresAt,
    usedAt: null,
    revokedAt: null,
    createdAt: now
  }
};

const activeUser: OrganizationUserRecord = {
  ...pendingUser,
  passwordHash: "stored-password-hash",
  invitation: {
    ...pendingUser.invitation!,
    usedAt: now
  }
};

function createDependencies(
  overrides: Partial<UserManagementServiceDependencies> = {}
): UserManagementServiceDependencies {
  return {
    listOrganizationUsers: vi.fn(async () => [activeUser]),
    createInvitedUserWithInvitation: vi.fn(async () => pendingUser),
    changeOrganizationUserRole: vi.fn(async () => ({
      outcome: "updated" as const,
      user: {
        ...activeUser,
        role: UserRole.ADMIN
      },
      revokedSessionCount: 0,
      revokedInvitationCount: 0
    })),
    setOrganizationUserDisabled: vi.fn(async (_context, _userId, disabled) => ({
      outcome: "updated" as const,
      user: {
        ...activeUser,
        disabledAt: disabled ? now : null
      },
      revokedSessionCount: disabled ? 2 : 0,
      revokedInvitationCount: 0
    })),
    revokeOrganizationUserSessions: vi.fn(async () => ({
      outcome: "updated" as const,
      user: activeUser,
      revokedSessionCount: 3,
      revokedInvitationCount: 0
    })),
    revokeOrganizationUserInvitation: vi.fn(async () => ({
      outcome: "updated" as const,
      user: {
        ...pendingUser,
        invitation: {
          ...pendingUser.invitation!,
          revokedAt: now
        }
      },
      revokedSessionCount: 0,
      revokedInvitationCount: 1
    })),
    replaceOrganizationUserInvitation: vi.fn(async () => ({
      outcome: "updated" as const,
      user: pendingUser,
      revokedSessionCount: 0,
      revokedInvitationCount: 0
    })),
    createToken: vi.fn(() => rawToken),
    hashToken: vi.fn(() => "token-hash"),
    calculateExpiresAt: vi.fn(() => expiresAt),
    ...overrides
  };
}

describe("user management service", () => {
  it("allows an OWNER to list only through the trusted tenant context", async () => {
    const dependencies = createDependencies();
    const result = await listUsersForOrganization(
      ownerContext,
      dependencies,
      now
    );

    expect(dependencies.listOrganizationUsers).toHaveBeenCalledWith(
      ownerContext
    );
    expect(result[0]).toMatchObject({
      id: "user-2",
      status: "ACTIVE",
      roleLabel: "Tecnico"
    });
    expect(result[0]).not.toHaveProperty("passwordHash");
    expect(result[0]).not.toHaveProperty("organizationId");
  });

  it.each([UserRole.ADMIN, UserRole.TECHNICIAN])(
    "rejects %s before listing users",
    async (role) => {
      const dependencies = createDependencies();

      await expect(
        listUsersForOrganization(
          {
            ...ownerContext,
            role
          },
          dependencies,
          now
        )
      ).rejects.toThrow(AuthorizationError);
      expect(dependencies.listOrganizationUsers).not.toHaveBeenCalled();
    }
  );

  it("creates an invitation with only the token hash sent to persistence", async () => {
    const dependencies = createDependencies();
    const result = await inviteOrganizationUser(
      ownerContext,
      {
        name: " Ana Tecnica ",
        email: " ANA@EXAMPLE.COM ",
        role: UserRole.TECHNICIAN
      },
      dependencies,
      now
    );

    expect(dependencies.createInvitedUserWithInvitation).toHaveBeenCalledWith(
      ownerContext,
      {
        name: "Ana Tecnica",
        email: "ana@example.com",
        role: UserRole.TECHNICIAN,
        tokenHash: "token-hash",
        expiresAt
      }
    );
    expect(result.setupPath).toBe(`/setup-account/${rawToken}`);
    expect(
      JSON.stringify(
        vi.mocked(dependencies.createInvitedUserWithInvitation).mock.calls
      )
    ).not.toContain(rawToken);
  });

  it("returns a generic conflict for duplicate email or token", async () => {
    await expect(
      inviteOrganizationUser(
        ownerContext,
        {
          name: "Ana Tecnica",
          email: "ana@example.com",
          role: UserRole.TECHNICIAN
        },
        createDependencies({
          createInvitedUserWithInvitation: vi.fn(async () => {
            throw new UserInvitationConflictError();
          })
        }),
        now
      )
    ).rejects.toThrow(ConflictError);
  });

  it("allows a role change and passes the trusted context", async () => {
    const dependencies = createDependencies();
    const result = await changeUserRole(
      ownerContext,
      "user-2",
      UserRole.ADMIN,
      dependencies,
      now
    );

    expect(dependencies.changeOrganizationUserRole).toHaveBeenCalledWith(
      ownerContext,
      "user-2",
      UserRole.ADMIN
    );
    expect(result.user.role).toBe(UserRole.ADMIN);
  });

  it("prevents an OWNER from changing their own role", async () => {
    const dependencies = createDependencies();

    await expect(
      changeUserRole(
        ownerContext,
        ownerContext.userId,
        UserRole.ADMIN,
        dependencies,
        now
      )
    ).rejects.toThrow(AuthorizationError);
    expect(dependencies.changeOrganizationUserRole).not.toHaveBeenCalled();
  });

  it("prevents demoting the last active OWNER", async () => {
    await expect(
      changeUserRole(
        ownerContext,
        "owner-2",
        UserRole.ADMIN,
        createDependencies({
          changeOrganizationUserRole: vi.fn(async () => ({
            outcome: "last_active_owner" as const
          }))
        }),
        now
      )
    ).rejects.toThrow(LAST_ACTIVE_OWNER_MESSAGE);
  });

  it("prevents an OWNER from disabling their own account", async () => {
    const dependencies = createDependencies();

    await expect(
      disableOrganizationUser(
        ownerContext,
        ownerContext.userId,
        dependencies,
        now
      )
    ).rejects.toThrow(AuthorizationError);
    expect(dependencies.setOrganizationUserDisabled).not.toHaveBeenCalled();
  });

  it("disables a user and reports all revoked sessions", async () => {
    const dependencies = createDependencies();
    const result = await disableOrganizationUser(
      ownerContext,
      "user-2",
      dependencies,
      now
    );

    expect(dependencies.setOrganizationUserDisabled).toHaveBeenCalledWith(
      ownerContext,
      "user-2",
      true,
      now
    );
    expect(result).toMatchObject({
      revokedSessionCount: 2,
      user: {
        status: "DISABLED"
      }
    });
  });

  it("prevents disabling the last active OWNER", async () => {
    await expect(
      disableOrganizationUser(
        ownerContext,
        "owner-2",
        createDependencies({
          setOrganizationUserDisabled: vi.fn(async () => ({
            outcome: "last_active_owner" as const
          }))
        }),
        now
      )
    ).rejects.toThrow(DomainError);
  });

  it("treats a valid cross-tenant user id as not found", async () => {
    await expect(
      revokeAllOrganizationUserSessions(
        ownerContext,
        "user-from-org-2",
        createDependencies({
          revokeOrganizationUserSessions: vi.fn(async () => ({
            outcome: "not_found" as const
          }))
        }),
        now
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("reactivates a user through a tenant-aware mutation", async () => {
    const dependencies = createDependencies();

    await reactivateOrganizationUser(
      ownerContext,
      "user-2",
      dependencies,
      now
    );

    expect(dependencies.setOrganizationUserDisabled).toHaveBeenCalledWith(
      ownerContext,
      "user-2",
      false,
      now
    );
  });

  it("revokes sessions and invitations through separate OWNER-only operations", async () => {
    const dependencies = createDependencies();

    const sessions = await revokeAllOrganizationUserSessions(
      ownerContext,
      "user-2",
      dependencies,
      now
    );
    const invitation = await revokeUserInvitation(
      ownerContext,
      "user-2",
      dependencies,
      now
    );

    expect(sessions.revokedSessionCount).toBe(3);
    expect(invitation.revokedInvitationCount).toBe(1);
  });

  it("reissues a setup link without persisting the raw token", async () => {
    const dependencies = createDependencies();
    const result = await reissueUserInvitation(
      ownerContext,
      "user-2",
      dependencies,
      now
    );

    expect(dependencies.replaceOrganizationUserInvitation).toHaveBeenCalledWith(
      ownerContext,
      "user-2",
      {
        tokenHash: "token-hash",
        expiresAt,
        now
      }
    );
    expect(result.setupPath).toContain(rawToken);
    expect(
      JSON.stringify(
        vi.mocked(dependencies.replaceOrganizationUserInvitation).mock.calls
      )
    ).not.toContain(rawToken);
  });
});
