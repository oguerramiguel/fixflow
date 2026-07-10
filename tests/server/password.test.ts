import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("password hashing", () => {
  it("does not return the raw password as the hash", async () => {
    const password = "valid-password-123";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
  });

  it("validates the correct password", async () => {
    const password = "valid-password-123";
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashPassword("valid-password-123");

    await expect(verifyPassword("wrong-password-123", passwordHash)).resolves.toBe(
      false
    );
  });
});
