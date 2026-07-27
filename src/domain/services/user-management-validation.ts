import { UserRole } from "@prisma/client";
import { normalizeEmail } from "@/domain/services/email";

export const USER_NAME_MIN_LENGTH = 2;
export const USER_NAME_MAX_LENGTH = 120;
export const USER_EMAIL_MAX_LENGTH = 254;
export const RESOURCE_ID_MAX_LENGTH = 128;

export type UserManagementField = "name" | "email" | "role" | "userId";

export type InviteUserInput = {
  name: string;
  email: string;
  role: string;
};

export type ValidatedInviteUserInput = {
  name: string;
  email: string;
  role: UserRole;
};

export type UserManagementValidationResult<TData> =
  | {
      valid: true;
      data: TData;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<UserManagementField, string>>;
    };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resourceIdPattern = /^[A-Za-z0-9_-]+$/;
const userRoles = Object.values(UserRole);

export function validateInviteUserInput(
  input: InviteUserInput
): UserManagementValidationResult<ValidatedInviteUserInput> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const fieldErrors: Partial<Record<UserManagementField, string>> = {};

  if (name.length < USER_NAME_MIN_LENGTH) {
    fieldErrors.name = `Nome deve ter pelo menos ${USER_NAME_MIN_LENGTH} caracteres.`;
  } else if (name.length > USER_NAME_MAX_LENGTH) {
    fieldErrors.name = `Nome deve ter no maximo ${USER_NAME_MAX_LENGTH} caracteres.`;
  }

  if (!email) {
    fieldErrors.email = "Email e obrigatorio.";
  } else if (email.length > USER_EMAIL_MAX_LENGTH) {
    fieldErrors.email = `Email deve ter no maximo ${USER_EMAIL_MAX_LENGTH} caracteres.`;
  } else if (!emailPattern.test(email)) {
    fieldErrors.email = "Email deve ter um formato valido.";
  }

  const role = userRoles.includes(input.role as UserRole)
    ? (input.role as UserRole)
    : UserRole.TECHNICIAN;

  if (!userRoles.includes(input.role as UserRole)) {
    fieldErrors.role = "Papel de usuario invalido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: {
      name,
      email,
      role
    }
  };
}

export function validateUserRole(
  roleInput: string
): UserManagementValidationResult<UserRole> {
  if (userRoles.includes(roleInput as UserRole)) {
    return {
      valid: true,
      data: roleInput as UserRole
    };
  }

  return {
    valid: false,
    fieldErrors: {
      role: "Papel de usuario invalido."
    }
  };
}

export function validateUserId(
  userIdInput: string
): UserManagementValidationResult<string> {
  const userId = userIdInput.trim();

  if (
    userId &&
    userId.length <= RESOURCE_ID_MAX_LENGTH &&
    resourceIdPattern.test(userId)
  ) {
    return {
      valid: true,
      data: userId
    };
  }

  return {
    valid: false,
    fieldErrors: {
      userId: "Usuario informado e invalido."
    }
  };
}
