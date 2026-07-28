import { DomainError } from "@/domain/errors/domain-error";
import { ValidationError } from "@/domain/errors/validation-error";
import { validatePassword } from "@/domain/services/password-policy";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  changeOwnPasswordAndRevokeSessions,
  findOwnPasswordCredential,
  type PasswordChangeMutationResult,
  type PasswordCredentialRecord
} from "@/server/repositories/password-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

export const PASSWORD_CHANGE_REJECTED_MESSAGE =
  "Nao foi possivel alterar a senha. Confira a senha atual e tente novamente.";

export type PasswordChangeField =
  | "currentPassword"
  | "newPassword"
  | "newPasswordConfirmation";

export type ChangeOwnPasswordInput = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
};

export type ChangeOwnPasswordResult = {
  userId: string;
  organizationId: string;
  revokedSessionCount: number;
};

export type PasswordServiceDependencies = {
  findOwnPasswordCredential(
    context: TenantContext,
    userId: string
  ): Promise<PasswordCredentialRecord | null>;
  changeOwnPasswordAndRevokeSessions(
    context: TenantContext,
    userId: string,
    expectedPasswordHash: string,
    newPasswordHash: string
  ): Promise<PasswordChangeMutationResult | null>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
};

const defaultPasswordServiceDependencies: PasswordServiceDependencies = {
  findOwnPasswordCredential,
  changeOwnPasswordAndRevokeSessions,
  verifyPassword,
  hashPassword
};

function createPasswordValidationError(
  fieldErrors: Partial<Record<PasswordChangeField, string>>
): ValidationError<PasswordChangeField> {
  return new ValidationError("Senha invalida.", fieldErrors);
}

function validatePasswordChangeOrThrow(input: ChangeOwnPasswordInput): void {
  const fieldErrors: Partial<Record<PasswordChangeField, string>> = {};
  const currentPasswordValidation = validatePassword(input.currentPassword);
  const newPasswordValidation = validatePassword(input.newPassword);

  if (!currentPasswordValidation.valid) {
    fieldErrors.currentPassword = PASSWORD_CHANGE_REJECTED_MESSAGE;
  }

  if (!newPasswordValidation.valid) {
    fieldErrors.newPassword =
      "Use uma senha entre 12 e 64 caracteres que respeite o limite seguro do bcrypt.";
  }

  if (input.newPasswordConfirmation !== input.newPassword) {
    fieldErrors.newPasswordConfirmation =
      "A confirmacao da nova senha nao confere.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw createPasswordValidationError(fieldErrors);
  }
}

export async function changeOwnPassword(
  context: AuthenticatedContext,
  input: ChangeOwnPasswordInput,
  dependencies = defaultPasswordServiceDependencies
): Promise<ChangeOwnPasswordResult> {
  validatePasswordChangeOrThrow(input);

  const credential = await dependencies.findOwnPasswordCredential(
    context,
    context.userId
  );

  if (!credential) {
    throw new DomainError(PASSWORD_CHANGE_REJECTED_MESSAGE);
  }

  const currentPasswordMatches = await dependencies.verifyPassword(
    input.currentPassword,
    credential.passwordHash
  );

  if (!currentPasswordMatches) {
    throw new DomainError(PASSWORD_CHANGE_REJECTED_MESSAGE);
  }

  const reusesCurrentPassword = await dependencies.verifyPassword(
    input.newPassword,
    credential.passwordHash
  );

  if (reusesCurrentPassword) {
    throw createPasswordValidationError({
      newPassword: "A nova senha deve ser diferente da senha atual."
    });
  }

  const newPasswordHash = await dependencies.hashPassword(input.newPassword);
  const result = await dependencies.changeOwnPasswordAndRevokeSessions(
    context,
    context.userId,
    credential.passwordHash,
    newPasswordHash
  );

  if (!result) {
    throw new DomainError(PASSWORD_CHANGE_REJECTED_MESSAGE);
  }

  return result;
}
