import bcrypt from "bcryptjs";
import { assertValidPassword } from "../../domain/services/password-policy";

export const PASSWORD_HASH_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  assertValidPassword(password);

  return bcrypt.hash(password, PASSWORD_HASH_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
