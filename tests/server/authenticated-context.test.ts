import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import {
  resolveAuthenticatedContextFromSessionToken,
  type AuthenticatedContextDependencies
} from "@/server/auth/authenticated-context";

function createDependencies(
  overrides: Partial<AuthenticatedContextDependencies> = {}
): AuthenticatedContextDependencies {
  return {
    findValidSessionByToken: vi.fn(async () => ({
      userId: "user-1"
    })),
    findUserById: vi.fn(async () => ({
      id: "user-1",
      organizationId: "org-from-database",
      role: UserRole.OWNER
    })),
    ...overrides
  };
}

describe("authenticated context", () => {
  it("resolves userId, organizationId and role from a valid session", async () => {
    const context = await resolveAuthenticatedContextFromSessionToken(
      "raw-session-token",
      createDependencies()
    );

    expect(context).toEqual({
      userId: "user-1",
      organizationId: "org-from-database",
      role: UserRole.OWNER
    });
  });

  it("rejects a missing session", async () => {
    await expect(
      resolveAuthenticatedContextFromSessionToken(
        undefined,
        createDependencies()
      )
    ).rejects.toThrow(AuthenticationError);
  });

  it("rejects an unknown session", async () => {
    await expect(
      resolveAuthenticatedContextFromSessionToken(
        "raw-session-token",
        createDependencies({
          findValidSessionByToken: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(AuthenticationError);
  });

  it("rejects a session whose user no longer exists", async () => {
    await expect(
      resolveAuthenticatedContextFromSessionToken(
        "raw-session-token",
        createDependencies({
          findUserById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(AuthenticationError);
  });

  it("uses the organizationId persisted on the user, not client input", async () => {
    const clientProvidedOrganizationId = "org-from-client";
    const context = await resolveAuthenticatedContextFromSessionToken(
      "raw-session-token",
      createDependencies()
    );

    expect(clientProvidedOrganizationId).not.toBe(context.organizationId);
    expect(context.organizationId).toBe("org-from-database");
  });
});
