import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/domain/errors/domain-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  changeOwnPassword,
  type PasswordServiceDependencies
} from "@/server/services/password-service";

const context: AuthenticatedContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: UserRole.TECHNICIAN
};

function createDependencies(
  overrides: Partial<PasswordServiceDependencies> = {}
): PasswordServiceDependencies {
  return {
    findOwnPasswordCredential: vi.fn(async () => ({
      userId: "user-1",
      organizationId: "org-1",
      passwordHash: "current-password-hash"
    })),
    verifyPassword: vi.fn(async (password) => password === "current-password-123"),
    hashPassword: vi.fn(async () => "new-password-hash"),
    changeOwnPasswordAndRevokeSessions: vi.fn(async () => ({
      userId: "user-1",
      organizationId: "org-1",
      revokedSessionCount: 3
    })),
    ...overrides
  };
}

describe("password service", () => {
  it("changes the password with the trusted context and revokes every session", async () => {
    const dependencies = createDependencies();

    const result = await changeOwnPassword(
      context,
      {
        currentPassword: "current-password-123",
        newPassword: "different-password-456",
        newPasswordConfirmation: "different-password-456"
      },
      dependencies
    );

    expect(dependencies.findOwnPasswordCredential).toHaveBeenCalledWith(
      context,
      "user-1"
    );
    expect(dependencies.changeOwnPasswordAndRevokeSessions).toHaveBeenCalledWith(
      context,
      "user-1",
      "current-password-hash",
      "new-password-hash"
    );
    expect(result.revokedSessionCount).toBe(3);
  });

  it("rejects an incorrect current password without hashing or mutation", async () => {
    const dependencies = createDependencies({
      verifyPassword: vi.fn(async () => false)
    });

    await expect(
      changeOwnPassword(
        context,
        {
          currentPassword: "wrong-password-123",
          newPassword: "different-password-456",
          newPasswordConfirmation: "different-password-456"
        },
        dependencies
      )
    ).rejects.toThrow(DomainError);
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(
      dependencies.changeOwnPasswordAndRevokeSessions
    ).not.toHaveBeenCalled();
  });

  it("rejects an invalid new password before reading credentials", async () => {
    const dependencies = createDependencies();

    await expect(
      changeOwnPassword(
        context,
        {
          currentPassword: "current-password-123",
          newPassword: "short",
          newPasswordConfirmation: "short"
        },
        dependencies
      )
    ).rejects.toThrow(ValidationError);
    expect(dependencies.findOwnPasswordCredential).not.toHaveBeenCalled();
  });

  it("rejects a current password outside the accepted bcrypt policy", async () => {
    const dependencies = createDependencies();

    await expect(
      changeOwnPassword(
        context,
        {
          currentPassword: `${"x".repeat(64)}-suffix`,
          newPassword: "different-password-456",
          newPasswordConfirmation: "different-password-456"
        },
        dependencies
      )
    ).rejects.toMatchObject({
      name: "ValidationError",
      fieldErrors: {
        currentPassword:
          "Nao foi possivel alterar a senha. Confira a senha atual e tente novamente."
      }
    });
    expect(dependencies.findOwnPasswordCredential).not.toHaveBeenCalled();
  });

  it("rejects reuse of the current password", async () => {
    const dependencies = createDependencies();

    await expect(
      changeOwnPassword(
        context,
        {
          currentPassword: "current-password-123",
          newPassword: "current-password-123",
          newPasswordConfirmation: "current-password-123"
        },
        dependencies
      )
    ).rejects.toMatchObject({
      name: "ValidationError",
      fieldErrors: {
        newPassword: "A nova senha deve ser diferente da senha atual."
      }
    });
    expect(
      dependencies.changeOwnPasswordAndRevokeSessions
    ).not.toHaveBeenCalled();
  });

  it("fails safely when a concurrent password update invalidates the expected hash", async () => {
    const dependencies = createDependencies({
      changeOwnPasswordAndRevokeSessions: vi.fn(async () => null)
    });

    await expect(
      changeOwnPassword(
        context,
        {
          currentPassword: "current-password-123",
          newPassword: "different-password-456",
          newPasswordConfirmation: "different-password-456"
        },
        dependencies
      )
    ).rejects.toThrow(
      "Nao foi possivel alterar a senha. Confira a senha atual e tente novamente."
    );
  });
});
