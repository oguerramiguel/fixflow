import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  INVALID_CREDENTIALS_MESSAGE
} from "@/domain/errors/authentication-error";
import {
  loginWithEmailAndPassword,
  type LoginServiceDependencies
} from "@/server/auth/login-service";
import type { AuthUserForLogin } from "@/server/repositories/auth-user-repository";

const existingUser: AuthUserForLogin = {
  id: "user-1",
  organizationId: "org-1",
  name: "Owner",
  email: "owner@example.com",
  passwordHash: "stored-password-hash",
  role: UserRole.OWNER
};

function createDependencies(
  overrides: Partial<LoginServiceDependencies> = {}
): LoginServiceDependencies {
  return {
    findUserByEmail: vi.fn(async () => existingUser),
    verifyPassword: vi.fn(async () => true),
    createSession: vi.fn(async () => ({
      sessionToken: "raw-session-token",
      expiresAt: new Date("2026-07-16T00:00:00.000Z")
    })),
    ...overrides
  };
}

describe("login service", () => {
  it("authenticates valid credentials", async () => {
    const dependencies = createDependencies();

    const result = await loginWithEmailAndPassword(
      {
        email: "  OWNER@EXAMPLE.COM ",
        password: "valid-password-123"
      },
      dependencies
    );

    expect(dependencies.findUserByEmail).toHaveBeenCalledWith(
      "owner@example.com"
    );
    expect(result).toMatchObject({
      sessionToken: "raw-session-token",
      user: {
        id: "user-1",
        organizationId: "org-1",
        name: "Owner",
        email: "owner@example.com",
        role: UserRole.OWNER
      }
    });
  });

  it("rejects an unknown user with a generic authentication error", async () => {
    const dependencies = createDependencies({
      findUserByEmail: vi.fn(async () => null)
    });

    await expect(
      loginWithEmailAndPassword(
        {
          email: "missing@example.com",
          password: "valid-password-123"
        },
        dependencies
      )
    ).rejects.toMatchObject({
      name: "AuthenticationError",
      message: INVALID_CREDENTIALS_MESSAGE
    });
  });

  it("rejects an invalid password with the same generic message", async () => {
    const dependencies = createDependencies({
      verifyPassword: vi.fn(async () => false)
    });

    await expect(
      loginWithEmailAndPassword(
        {
          email: "owner@example.com",
          password: "valid-password-123"
        },
        dependencies
      )
    ).rejects.toThrow(AuthenticationError);

    await expect(
      loginWithEmailAndPassword(
        {
          email: "owner@example.com",
          password: "valid-password-123"
        },
        dependencies
      )
    ).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
  });

  it("does not return passwordHash in the login result", async () => {
    const result = await loginWithEmailAndPassword(
      {
        email: "owner@example.com",
        password: "valid-password-123"
      },
      createDependencies()
    );

    expect(result).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(result)).not.toContain(existingUser.passwordHash);
  });
});
