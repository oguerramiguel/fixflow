import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { DomainError } from "@/domain/errors/domain-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { hashPasswordResetToken } from "@/server/auth/password-reset-token";
import type { SecurityRuntimeConfig } from "@/server/security/security-env";
import {
  completePasswordReset,
  createPasswordResetLink,
  isPasswordResetAvailable,
  revokePasswordResetLinks,
  type PasswordResetServiceDependencies
} from "@/server/services/password-reset-service";

const now = new Date("2026-07-28T12:00:00.000Z");
const rawToken = "a".repeat(43);
const tokenHash = hashPasswordResetToken(rawToken);
const ownerContext: AuthenticatedContext = {
  userId: "owner-1",
  organizationId: "org-1",
  role: UserRole.OWNER
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
    batchSize: 500
  }
};

const availableReset = {
  id: "reset-1",
  organizationId: "org-1",
  userId: "user-2",
  expiresAt: new Date("2026-07-28T12:30:00.000Z"),
  usedAt: null,
  revokedAt: null,
  user: {
    passwordHash: "stored-password-hash",
    disabledAt: null
  }
};

function createDependencies(
  overrides: Partial<PasswordResetServiceDependencies> = {}
): PasswordResetServiceDependencies {
  return {
    createPasswordResetForUser: vi.fn(async () => ({
      outcome: "created" as const,
      userId: "user-2",
      organizationId: "org-1",
      revokedTokenCount: 1
    })),
    revokePasswordResetsForUser: vi.fn(async () => ({
      outcome: "updated" as const,
      userId: "user-2",
      organizationId: "org-1",
      revokedTokenCount: 1
    })),
    findPasswordResetByTokenHash: vi.fn(async () => availableReset),
    consumePasswordReset: vi.fn(async () => ({
      organizationId: "org-1",
      userId: "user-2",
      revokedSessionCount: 2,
      revokedTokenCount: 0
    })),
    createToken: vi.fn(() => rawToken),
    hashToken: vi.fn(() => tokenHash),
    hashPassword: vi.fn(async () => "new-password-hash"),
    getConfig: () => config,
    ...overrides
  };
}

describe("password reset service", () => {
  it("lets only an OWNER create a 30 minute one-time link for a tenant user", async () => {
    const dependencies = createDependencies();
    const result = await createPasswordResetLink(
      ownerContext,
      "user-2",
      dependencies,
      now
    );

    expect(dependencies.createPasswordResetForUser).toHaveBeenCalledWith(
      ownerContext,
      {
        createdByUserId: "owner-1",
        userId: "user-2",
        tokenHash,
        expiresAt: new Date("2026-07-28T12:30:00.000Z"),
        now
      }
    );
    expect(result).toEqual({
      userId: "user-2",
      resetPath: `/reset-password/${rawToken}`,
      expiresAt: new Date("2026-07-28T12:30:00.000Z"),
      revokedTokenCount: 1
    });
    expect(
      JSON.stringify(
        vi.mocked(dependencies.createPasswordResetForUser).mock.calls
      )
    ).not.toContain(rawToken);
  });

  it.each([UserRole.ADMIN, UserRole.TECHNICIAN])(
    "rejects %s before creating a token record",
    async (role) => {
      const dependencies = createDependencies();

      await expect(
        createPasswordResetLink(
          {
            ...ownerContext,
            role
          },
          "user-2",
          dependencies,
          now
        )
      ).rejects.toThrow(AuthorizationError);
      expect(dependencies.createPasswordResetForUser).not.toHaveBeenCalled();
    }
  );

  it.each(["not_found", "unavailable"] as const)(
    "uses the same safe error for a %s target, including cross-tenant, INVITED or DISABLED users",
    async (outcome) => {
      await expect(
        createPasswordResetLink(
          ownerContext,
          "user-from-another-tenant",
          createDependencies({
            createPasswordResetForUser: vi.fn(async () => ({
              outcome
            }))
          }),
          now
        )
      ).rejects.toThrow(DomainError);
    }
  );

  it("revokes pending reset links through an OWNER-only tenant mutation", async () => {
    const dependencies = createDependencies();

    await expect(
      revokePasswordResetLinks(ownerContext, "user-2", dependencies, now)
    ).resolves.toEqual({
      userId: "user-2",
      revokedTokenCount: 1
    });
    expect(dependencies.revokePasswordResetsForUser).toHaveBeenCalledWith(
      ownerContext,
      "user-2",
      now
    );
  });

  it.each([
    {
      name: "expired",
      reset: {
        ...availableReset,
        expiresAt: now
      }
    },
    {
      name: "revoked",
      reset: {
        ...availableReset,
        revokedAt: now
      }
    },
    {
      name: "used",
      reset: {
        ...availableReset,
        usedAt: now
      }
    },
    {
      name: "disabled user",
      reset: {
        ...availableReset,
        user: {
          ...availableReset.user,
          disabledAt: now
        }
      }
    }
  ])("reports a $name token as generically unavailable", async ({ reset }) => {
    await expect(
      isPasswordResetAvailable(
        rawToken,
        createDependencies({
          findPasswordResetByTokenHash: vi.fn(async () => reset)
        }),
        now
      )
    ).resolves.toBe(false);
  });

  it("hashes a valid new password and delegates only the hash to atomic consumption", async () => {
    const dependencies = createDependencies();

    const result = await completePasswordReset(
      rawToken,
      {
        password: "new-password-456",
        passwordConfirmation: "new-password-456"
      },
      dependencies,
      now
    );

    expect(dependencies.consumePasswordReset).toHaveBeenCalledWith(
      tokenHash,
      "new-password-hash",
      now
    );
    expect(result).toMatchObject({
      revokedSessionCount: 2
    });
    expect(
      JSON.stringify(vi.mocked(dependencies.consumePasswordReset).mock.calls)
    ).not.toContain(rawToken);
  });

  it("rejects invalid passwords before hashing or token consumption", async () => {
    const dependencies = createDependencies();

    await expect(
      completePasswordReset(
        rawToken,
        {
          password: "short",
          passwordConfirmation: "different"
        },
        dependencies,
        now
      )
    ).rejects.toThrow(ValidationError);
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(dependencies.consumePasswordReset).not.toHaveBeenCalled();
  });

  it("returns the same unavailable result for malformed tokens", async () => {
    const dependencies = createDependencies();

    await expect(
      completePasswordReset(
        "invalid-token",
        {
          password: "new-password-456",
          passwordConfirmation: "new-password-456"
        },
        dependencies,
        now
      )
    ).resolves.toBeNull();
    expect(dependencies.consumePasswordReset).not.toHaveBeenCalled();
  });

  it("does not spend a password hash on a valid-shaped unavailable token", async () => {
    const dependencies = createDependencies({
      findPasswordResetByTokenHash: vi.fn(async () => null)
    });

    await expect(
      completePasswordReset(
        rawToken,
        {
          password: "new-password-456",
          passwordConfirmation: "new-password-456"
        },
        dependencies,
        now
      )
    ).resolves.toBeNull();
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(dependencies.consumePasswordReset).not.toHaveBeenCalled();
  });
});
