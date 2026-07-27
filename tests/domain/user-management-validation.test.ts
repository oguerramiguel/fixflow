import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  validateInviteUserInput,
  validateUserId,
  validateUserRole
} from "@/domain/services/user-management-validation";

describe("user management validation", () => {
  it("normalizes valid invitation data", () => {
    expect(
      validateInviteUserInput({
        name: "  Ana Tecnica  ",
        email: "  ANA@EXAMPLE.COM ",
        role: UserRole.TECHNICIAN
      })
    ).toEqual({
      valid: true,
      data: {
        name: "Ana Tecnica",
        email: "ana@example.com",
        role: UserRole.TECHNICIAN
      }
    });
  });

  it("rejects invalid name, email and role", () => {
    const result = validateInviteUserInput({
      name: "A",
      email: "invalid",
      role: "SUPER_ADMIN"
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.fieldErrors).toEqual({
        name: expect.any(String),
        email: expect.any(String),
        role: expect.any(String)
      });
    }
  });

  it.each(Object.values(UserRole))("accepts the %s role", (role) => {
    expect(validateUserRole(role)).toEqual({
      valid: true,
      data: role
    });
  });

  it("rejects a forged role", () => {
    expect(validateUserRole("SUPER_ADMIN").valid).toBe(false);
  });

  it("accepts a valid resource id", () => {
    expect(validateUserId(" user_123 ")).toEqual({
      valid: true,
      data: "user_123"
    });
  });

  it("rejects an invalid resource id", () => {
    expect(validateUserId("../other-tenant").valid).toBe(false);
  });
});
