import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import {
  hasRole,
  requireRole
} from "@/server/auth/authorization";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";

const ownerContext: AuthenticatedContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: UserRole.OWNER
};

describe("role authorization", () => {
  it("accepts an allowed role", () => {
    expect(hasRole(ownerContext, [UserRole.OWNER, UserRole.ADMIN])).toBe(true);
    expect(() => requireRole(ownerContext, [UserRole.OWNER])).not.toThrow();
  });

  it("rejects a disallowed role", () => {
    expect(hasRole(ownerContext, [UserRole.TECHNICIAN])).toBe(false);
    expect(() => requireRole(ownerContext, [UserRole.TECHNICIAN])).toThrow(
      AuthorizationError
    );
  });
});
