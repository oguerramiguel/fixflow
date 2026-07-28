import { UserRole } from "@prisma/client";
import { DomainError } from "@/domain/errors/domain-error";
import { ValidationError } from "@/domain/errors/validation-error";
import { validatePassword } from "@/domain/services/password-policy";
import {
  type UserManagementField,
  validateUserId
} from "@/domain/services/user-management-validation";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { requireRole } from "@/server/auth/authorization";
import { hashPassword } from "@/server/auth/password";
import {
  calculatePasswordResetExpiresAt,
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenFormatValid
} from "@/server/auth/password-reset-token";
import {
  consumePasswordReset,
  createPasswordResetForUser,
  findPasswordResetByTokenHash,
  revokePasswordResetsForUser,
  type ConsumedPasswordResetRecord,
  type CreatePasswordResetRecordInput,
  type CreatePasswordResetRecordResult,
  type PasswordResetAvailabilityRecord,
  type RevokePasswordResetRecordResult
} from "@/server/repositories/password-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";
import {
  getSecurityRuntimeConfig,
  type SecurityRuntimeConfig
} from "@/server/security/security-env";

export const PASSWORD_RESET_UNAVAILABLE_MESSAGE =
  "Este link de redefinicao nao e valido ou nao esta mais disponivel.";
export const PASSWORD_RESET_CREATE_UNAVAILABLE_MESSAGE =
  "Nao foi possivel gerar um link de redefinicao para este usuario.";

export type PasswordResetField = "password" | "passwordConfirmation";

export type CompletePasswordResetInput = {
  password: string;
  passwordConfirmation: string;
};

export type CreatePasswordResetResult = {
  userId: string;
  resetPath: string;
  expiresAt: Date;
  revokedTokenCount: number;
};

export type RevokePasswordResetResult = {
  userId: string;
  revokedTokenCount: number;
};

export type PasswordResetServiceDependencies = {
  createPasswordResetForUser(
    context: TenantContext,
    input: CreatePasswordResetRecordInput
  ): Promise<CreatePasswordResetRecordResult>;
  revokePasswordResetsForUser(
    context: TenantContext,
    userId: string,
    now: Date
  ): Promise<RevokePasswordResetRecordResult>;
  findPasswordResetByTokenHash(
    tokenHash: string
  ): Promise<PasswordResetAvailabilityRecord | null>;
  consumePasswordReset(
    tokenHash: string,
    newPasswordHash: string,
    now: Date
  ): Promise<ConsumedPasswordResetRecord | null>;
  createToken(): string;
  hashToken(token: string): string;
  hashPassword(password: string): Promise<string>;
  getConfig(): SecurityRuntimeConfig;
};

const defaultPasswordResetServiceDependencies: PasswordResetServiceDependencies =
  {
    createPasswordResetForUser,
    revokePasswordResetsForUser,
    findPasswordResetByTokenHash,
    consumePasswordReset,
    createToken: createPasswordResetToken,
    hashToken: hashPasswordResetToken,
    hashPassword,
    getConfig: getSecurityRuntimeConfig
  };

function validateUserIdOrThrow(userIdInput: string): string {
  const validation = validateUserId(userIdInput);

  if (!validation.valid) {
    throw new ValidationError<UserManagementField>(
      "Usuario informado e invalido.",
      validation.fieldErrors
    );
  }

  return validation.data;
}

function validatePasswordsOrThrow(input: CompletePasswordResetInput): void {
  const fieldErrors: Partial<Record<PasswordResetField, string>> = {};
  const passwordValidation = validatePassword(input.password);

  if (!passwordValidation.valid) {
    fieldErrors.password =
      "Use uma senha entre 12 e 64 caracteres que respeite o limite seguro do bcrypt.";
  }

  if (input.passwordConfirmation !== input.password) {
    fieldErrors.passwordConfirmation = "As senhas informadas nao conferem.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Senha invalida.", fieldErrors);
  }
}

function getTokenHashOrNull(token: string): string | null {
  if (!isPasswordResetTokenFormatValid(token)) {
    return null;
  }

  return hashPasswordResetToken(token);
}

function isPasswordResetRecordAvailable(
  reset: PasswordResetAvailabilityRecord | null,
  now: Date
): boolean {
  return Boolean(
    reset &&
      reset.usedAt === null &&
      reset.revokedAt === null &&
      reset.expiresAt > now &&
      reset.user.passwordHash !== null &&
      reset.user.disabledAt === null
  );
}

export async function createPasswordResetLink(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultPasswordResetServiceDependencies,
  now = new Date()
): Promise<CreatePasswordResetResult> {
  requireRole(context, [UserRole.OWNER]);
  const userId = validateUserIdOrThrow(userIdInput);
  const token = dependencies.createToken();
  const tokenHash = dependencies.hashToken(token);
  const config = dependencies.getConfig();
  const expiresAt = calculatePasswordResetExpiresAt(
    config.passwordReset.tokenTtlMinutes,
    now
  );
  const result = await dependencies.createPasswordResetForUser(context, {
    createdByUserId: context.userId,
    userId,
    tokenHash,
    expiresAt,
    now
  });

  if (result.outcome !== "created") {
    throw new DomainError(PASSWORD_RESET_CREATE_UNAVAILABLE_MESSAGE);
  }

  return {
    userId: result.userId,
    resetPath: `/reset-password/${token}`,
    expiresAt,
    revokedTokenCount: result.revokedTokenCount
  };
}

export async function revokePasswordResetLinks(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultPasswordResetServiceDependencies,
  now = new Date()
): Promise<RevokePasswordResetResult> {
  requireRole(context, [UserRole.OWNER]);
  const userId = validateUserIdOrThrow(userIdInput);
  const result = await dependencies.revokePasswordResetsForUser(
    context,
    userId,
    now
  );

  if (result.outcome !== "updated") {
    throw new DomainError(PASSWORD_RESET_CREATE_UNAVAILABLE_MESSAGE);
  }

  return {
    userId: result.userId,
    revokedTokenCount: result.revokedTokenCount
  };
}

export async function isPasswordResetAvailable(
  token: string,
  dependencies = defaultPasswordResetServiceDependencies,
  now = new Date()
): Promise<boolean> {
  const tokenHash = getTokenHashOrNull(token);

  if (!tokenHash) {
    return false;
  }

  const reset = await dependencies.findPasswordResetByTokenHash(tokenHash);

  return isPasswordResetRecordAvailable(reset, now);
}

export async function completePasswordReset(
  token: string,
  input: CompletePasswordResetInput,
  dependencies = defaultPasswordResetServiceDependencies,
  now = new Date()
): Promise<ConsumedPasswordResetRecord | null> {
  validatePasswordsOrThrow(input);
  const tokenHash = getTokenHashOrNull(token);

  if (!tokenHash) {
    return null;
  }

  const reset = await dependencies.findPasswordResetByTokenHash(tokenHash);

  if (!isPasswordResetRecordAvailable(reset, now)) {
    return null;
  }

  const newPasswordHash = await dependencies.hashPassword(input.password);

  return dependencies.consumePasswordReset(tokenHash, newPasswordHash, now);
}
