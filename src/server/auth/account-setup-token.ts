import { createHash, randomBytes } from "node:crypto";

export const ACCOUNT_SETUP_TOKEN_BYTES = 32;
export const ACCOUNT_SETUP_TOKEN_TTL_HOURS = 72;
export const ACCOUNT_SETUP_TOKEN_TTL_MS =
  ACCOUNT_SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000;

const accountSetupTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createAccountSetupToken(): string {
  return randomBytes(ACCOUNT_SETUP_TOKEN_BYTES).toString("base64url");
}

export function isAccountSetupTokenFormatValid(token: string): boolean {
  return accountSetupTokenPattern.test(token);
}

export function hashAccountSetupToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function calculateAccountSetupExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + ACCOUNT_SETUP_TOKEN_TTL_MS);
}
