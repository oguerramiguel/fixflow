import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePassword
} from "@/domain/services/password-policy";

describe("password policy", () => {
  it("rejects a short password", () => {
    expect(validatePassword("short").valid).toBe(false);
  });

  it("rejects a password above the maximum length", () => {
    expect(validatePassword("a".repeat(PASSWORD_MAX_LENGTH + 1)).valid).toBe(
      false
    );
  });

  it("accepts a valid password", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH)).valid).toBe(true);
  });
});
