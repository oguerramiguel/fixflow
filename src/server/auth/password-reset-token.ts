import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TOKEN_BYTES = 32;

const passwordResetTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createPasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function isPasswordResetTokenFormatValid(token: string): boolean {
  return passwordResetTokenPattern.test(token);
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function calculatePasswordResetExpiresAt(
  ttlMinutes: number,
  now = new Date()
): Date {
  return new Date(now.getTime() + ttlMinutes * 60 * 1000);
}
