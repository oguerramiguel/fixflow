import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/errors/validation-error";
import { hashAccountSetupToken } from "@/server/auth/account-setup-token";
import {
  completeAccountSetup,
  isAccountSetupInvitationAvailable,
  type AccountSetupServiceDependencies
} from "@/server/services/account-setup-service";

const token = "a".repeat(43);
const tokenHash = hashAccountSetupToken(token);
const now = new Date("2026-07-27T12:00:00.000Z");
const validInvitation = {
  id: "invitation-1",
  organizationId: "org-1",
  userId: "user-1",
  expiresAt: new Date("2026-07-30T12:00:00.000Z"),
  usedAt: null,
  revokedAt: null,
  user: {
    passwordHash: null,
    disabledAt: null
  }
};

function createDependencies(
  overrides: Partial<AccountSetupServiceDependencies> = {}
): AccountSetupServiceDependencies {
  return {
    findInvitationByTokenHash: vi.fn(async () => validInvitation),
    consumeInvitation: vi.fn(async () => ({
      organizationId: "org-1",
      userId: "user-1",
      role: UserRole.TECHNICIAN
    })),
    hashPassword: vi.fn(async () => "new-password-hash"),
    ...overrides
  };
}

describe("account setup service", () => {
  it("accepts an available invitation using only its hash in persistence", async () => {
    const dependencies = createDependencies();

    await expect(
      isAccountSetupInvitationAvailable(token, dependencies, now)
    ).resolves.toBe(true);
    expect(dependencies.findInvitationByTokenHash).toHaveBeenCalledWith(
      tokenHash
    );
    expect(
      JSON.stringify(
        vi.mocked(dependencies.findInvitationByTokenHash).mock.calls
      )
    ).not.toContain(token);
  });

  it.each([
    {
      name: "expired",
      invitation: {
        ...validInvitation,
        expiresAt: now
      }
    },
    {
      name: "revoked",
      invitation: {
        ...validInvitation,
        revokedAt: now
      }
    },
    {
      name: "already used",
      invitation: {
        ...validInvitation,
        usedAt: now
      }
    },
    {
      name: "disabled user",
      invitation: {
        ...validInvitation,
        user: {
          ...validInvitation.user,
          disabledAt: now
        }
      }
    }
  ])("rejects a $name invitation with the same availability result", async ({
    invitation
  }) => {
    await expect(
      isAccountSetupInvitationAvailable(
        token,
        createDependencies({
          findInvitationByTokenHash: vi.fn(async () => invitation)
        }),
        now
      )
    ).resolves.toBe(false);
  });

  it("sets the invited user's own valid password", async () => {
    const dependencies = createDependencies();
    const result = await completeAccountSetup(
      token,
      {
        password: "valid-password-123",
        passwordConfirmation: "valid-password-123"
      },
      dependencies,
      now
    );

    expect(dependencies.hashPassword).toHaveBeenCalledWith(
      "valid-password-123"
    );
    expect(dependencies.consumeInvitation).toHaveBeenCalledWith(
      tokenHash,
      "new-password-hash",
      now
    );
    expect(result).toEqual({
      organizationId: "org-1",
      userId: "user-1",
      role: UserRole.TECHNICIAN
    });
  });

  it("rejects an invalid password before hashing or consuming the invitation", async () => {
    const dependencies = createDependencies();

    await expect(
      completeAccountSetup(
        token,
        {
          password: "short",
          passwordConfirmation: "different"
        },
        dependencies,
        now
      )
    ).rejects.toThrow(ValidationError);
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(dependencies.consumeInvitation).not.toHaveBeenCalled();
  });

  it("returns the generic unavailable result for an invalid token format", async () => {
    const dependencies = createDependencies();

    await expect(
      completeAccountSetup(
        "invalid-token",
        {
          password: "valid-password-123",
          passwordConfirmation: "valid-password-123"
        },
        dependencies,
        now
      )
    ).resolves.toBeNull();
    expect(dependencies.consumeInvitation).not.toHaveBeenCalled();
  });

  it("does not activate twice when the same invite is consumed concurrently", async () => {
    let consumed = false;
    const consumeInvitation = vi.fn(async () => {
      if (consumed) {
        return null;
      }

      consumed = true;
      return {
        organizationId: "org-1",
        userId: "user-1",
        role: UserRole.TECHNICIAN
      };
    });
    const dependencies = createDependencies({
      consumeInvitation
    });

    const results = await Promise.all([
      completeAccountSetup(
        token,
        {
          password: "valid-password-123",
          passwordConfirmation: "valid-password-123"
        },
        dependencies,
        now
      ),
      completeAccountSetup(
        token,
        {
          password: "valid-password-123",
          passwordConfirmation: "valid-password-123"
        },
        dependencies,
        now
      )
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
