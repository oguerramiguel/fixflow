import { ValidationError } from "@/domain/errors/validation-error";
import { validatePassword } from "@/domain/services/password-policy";
import {
  hashAccountSetupToken,
  isAccountSetupTokenFormatValid
} from "@/server/auth/account-setup-token";
import { hashPassword } from "@/server/auth/password";
import {
  consumeAccountSetupInvitation,
  findAccountSetupInvitationByTokenHash,
  type AccountSetupInvitationRecord,
  type ConsumedAccountSetupInvitation
} from "@/server/repositories/user-management-repository";

export const ACCOUNT_SETUP_UNAVAILABLE_MESSAGE =
  "Este link de configuracao nao e valido ou nao esta mais disponivel.";

export type AccountSetupPasswordField = "password" | "passwordConfirmation";

export type CompleteAccountSetupInput = {
  password: string;
  passwordConfirmation: string;
};

export type AccountSetupServiceDependencies = {
  findInvitationByTokenHash(
    tokenHash: string
  ): Promise<AccountSetupInvitationRecord | null>;
  consumeInvitation(
    tokenHash: string,
    passwordHash: string,
    now: Date
  ): Promise<ConsumedAccountSetupInvitation | null>;
  hashPassword(password: string): Promise<string>;
};

const defaultAccountSetupServiceDependencies: AccountSetupServiceDependencies = {
  findInvitationByTokenHash: findAccountSetupInvitationByTokenHash,
  consumeInvitation: consumeAccountSetupInvitation,
  hashPassword
};

function createPasswordValidationError(
  fieldErrors: Partial<Record<AccountSetupPasswordField, string>>
): ValidationError<AccountSetupPasswordField> {
  return new ValidationError("Senha invalida.", fieldErrors);
}

function validatePasswordsOrThrow(input: CompleteAccountSetupInput): void {
  const fieldErrors: Partial<Record<AccountSetupPasswordField, string>> = {};
  const passwordValidation = validatePassword(input.password);

  if (!passwordValidation.valid) {
    fieldErrors.password =
      "Use uma senha entre 12 e 64 caracteres que respeite o limite seguro do bcrypt.";
  }

  if (input.passwordConfirmation !== input.password) {
    fieldErrors.passwordConfirmation = "As senhas informadas nao conferem.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw createPasswordValidationError(fieldErrors);
  }
}

function isInvitationAvailable(
  invitation: AccountSetupInvitationRecord | null,
  now: Date
): boolean {
  return Boolean(
    invitation &&
      invitation.usedAt === null &&
      invitation.revokedAt === null &&
      invitation.expiresAt > now &&
      invitation.user.passwordHash === null &&
      invitation.user.disabledAt === null
  );
}

function getTokenHashOrNull(token: string): string | null {
  if (!isAccountSetupTokenFormatValid(token)) {
    return null;
  }

  return hashAccountSetupToken(token);
}

export async function isAccountSetupInvitationAvailable(
  token: string,
  dependencies = defaultAccountSetupServiceDependencies,
  now = new Date()
): Promise<boolean> {
  const tokenHash = getTokenHashOrNull(token);

  if (!tokenHash) {
    return false;
  }

  const invitation = await dependencies.findInvitationByTokenHash(tokenHash);

  return isInvitationAvailable(invitation, now);
}

export async function completeAccountSetup(
  token: string,
  input: CompleteAccountSetupInput,
  dependencies = defaultAccountSetupServiceDependencies,
  now = new Date()
): Promise<ConsumedAccountSetupInvitation | null> {
  validatePasswordsOrThrow(input);
  const tokenHash = getTokenHashOrNull(token);

  if (!tokenHash) {
    return null;
  }

  const invitation = await dependencies.findInvitationByTokenHash(tokenHash);

  if (!isInvitationAvailable(invitation, now)) {
    return null;
  }

  const passwordHash = await dependencies.hashPassword(input.password);

  return dependencies.consumeInvitation(tokenHash, passwordHash, now);
}
