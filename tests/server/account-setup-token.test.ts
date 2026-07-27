import { describe, expect, it } from "vitest";
import {
  ACCOUNT_SETUP_TOKEN_TTL_HOURS,
  calculateAccountSetupExpiresAt,
  createAccountSetupToken,
  hashAccountSetupToken,
  isAccountSetupTokenFormatValid
} from "@/server/auth/account-setup-token";

describe("account setup token", () => {
  it("generates cryptographically sized Base64URL tokens", () => {
    const token = createAccountSetupToken();

    expect(token).toHaveLength(43);
    expect(isAccountSetupTokenFormatValid(token)).toBe(true);
  });

  it("generates different tokens", () => {
    expect(createAccountSetupToken()).not.toBe(createAccountSetupToken());
  });

  it("hashes deterministically without returning the raw token", () => {
    const token = createAccountSetupToken();
    const tokenHash = hashAccountSetupToken(token);

    expect(tokenHash).toBe(hashAccountSetupToken(token));
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses the documented 72 hour expiration", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");

    expect(ACCOUNT_SETUP_TOKEN_TTL_HOURS).toBe(72);
    expect(calculateAccountSetupExpiresAt(now)).toEqual(
      new Date("2026-07-30T12:00:00.000Z")
    );
  });
});
