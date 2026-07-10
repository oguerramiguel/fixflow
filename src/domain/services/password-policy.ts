import bcrypt from "bcryptjs";
import { DomainError } from "../errors/domain-error";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;

export type PasswordValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      message: string;
    };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must have at least ${PASSWORD_MIN_LENGTH} characters.`
    };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      message: `Password must have at most ${PASSWORD_MAX_LENGTH} characters.`
    };
  }

  if (bcrypt.truncates(password)) {
    return {
      valid: false,
      message: "Password must not exceed bcrypt input limits."
    };
  }

  return { valid: true };
}

export function assertValidPassword(password: string): void {
  const validationResult = validatePassword(password);

  if (!validationResult.valid) {
    throw new DomainError(validationResult.message);
  }
}
