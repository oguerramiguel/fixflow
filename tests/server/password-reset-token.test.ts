import { describe, expect, it } from "vitest";
import {
  calculatePasswordResetExpiresAt,
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenFormatValid,
  PASSWORD_RESET_TOKEN_BYTES
} from "@/server/auth/password-reset-token";

describe("password reset token", () => {
  it("uses 32 random bytes encoded as Base64URL", () => {
    const token = createPasswordResetToken();

    expect(PASSWORD_RESET_TOKEN_BYTES).toBe(32);
    expect(token).toHaveLength(43);
    expect(isPasswordResetTokenFormatValid(token)).toBe(true);
    expect(createPasswordResetToken()).not.toBe(token);
  });

  it("persists a deterministic SHA-256 hash instead of the raw token", () => {
    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);

    expect(tokenHash).toBe(hashPasswordResetToken(token));
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("calculates the configured expiration from UTC instants", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");

    expect(calculatePasswordResetExpiresAt(30, now)).toEqual(
      new Date("2026-07-28T12:30:00.000Z")
    );
  });
});
