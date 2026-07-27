import { UserRole } from "@prisma/client";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  type InviteUserInput,
  type UserManagementField,
  validateInviteUserInput,
  validateUserId,
  validateUserRole
} from "@/domain/services/user-management-validation";
import {
  calculateAccountSetupExpiresAt,
  createAccountSetupToken,
  hashAccountSetupToken
} from "@/server/auth/account-setup-token";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { requireRole } from "@/server/auth/authorization";
import {
  changeOrganizationUserRole,
  createInvitedUserWithInvitation,
  listOrganizationUsers,
  replaceOrganizationUserInvitation,
  revokeOrganizationUserInvitation,
  revokeOrganizationUserSessions,
  setOrganizationUserDisabled,
  UserInvitationConflictError,
  type CreateInvitedUserRecordInput,
  type OrganizationUserMutationResult,
  type OrganizationUserRecord,
  type ReplaceInvitationRecordInput
} from "@/server/repositories/user-management-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

export const USER_INVITATION_CREATE_ERROR_MESSAGE =
  "Nao foi possivel criar o convite para este email.";
export const LAST_ACTIVE_OWNER_MESSAGE =
  "O ultimo proprietario ativo da organizacao nao pode ser desativado ou rebaixado.";
export const SELF_ROLE_CHANGE_MESSAGE =
  "Voce nao pode alterar sua propria funcao.";
export const SELF_DISABLE_MESSAGE =
  "Voce nao pode desativar sua propria conta.";
export const USER_INVITATION_UNAVAILABLE_MESSAGE =
  "O convite nao esta disponivel para esta operacao.";

export type OrganizationUserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type UserInvitationStatus =
  | "PENDING"
  | "EXPIRED"
  | "REVOKED"
  | "USED";

export type UserInvitationDto = {
  status: UserInvitationStatus;
  statusLabel: string;
  expiresAt: Date;
  createdAt: Date;
};

export type OrganizationUserDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  status: OrganizationUserStatus;
  statusLabel: string;
  disabledAt: Date | null;
  createdAt: Date;
  isCurrentUser: boolean;
  invitation: UserInvitationDto | null;
};

export type InviteOrganizationUserResult = {
  user: OrganizationUserDto;
  setupPath: string;
  expiresAt: Date;
};

export type UserManagementOperationResult = {
  user: OrganizationUserDto;
  changed: boolean;
  revokedSessionCount: number;
  revokedInvitationCount: number;
};

export type UserManagementServiceDependencies = {
  listOrganizationUsers(
    context: TenantContext
  ): Promise<OrganizationUserRecord[]>;
  createInvitedUserWithInvitation(
    context: TenantContext,
    input: CreateInvitedUserRecordInput
  ): Promise<OrganizationUserRecord>;
  changeOrganizationUserRole(
    context: TenantContext,
    userId: string,
    role: UserRole
  ): Promise<OrganizationUserMutationResult>;
  setOrganizationUserDisabled(
    context: TenantContext,
    userId: string,
    disabled: boolean,
    now: Date
  ): Promise<OrganizationUserMutationResult>;
  revokeOrganizationUserSessions(
    context: TenantContext,
    userId: string
  ): Promise<OrganizationUserMutationResult>;
  revokeOrganizationUserInvitation(
    context: TenantContext,
    userId: string,
    now: Date
  ): Promise<OrganizationUserMutationResult>;
  replaceOrganizationUserInvitation(
    context: TenantContext,
    userId: string,
    input: ReplaceInvitationRecordInput
  ): Promise<OrganizationUserMutationResult>;
  createToken(): string;
  hashToken(token: string): string;
  calculateExpiresAt(now: Date): Date;
};

const defaultUserManagementServiceDependencies: UserManagementServiceDependencies =
  {
    listOrganizationUsers,
    createInvitedUserWithInvitation,
    changeOrganizationUserRole,
    setOrganizationUserDisabled,
    revokeOrganizationUserSessions,
    revokeOrganizationUserInvitation,
    replaceOrganizationUserInvitation,
    createToken: createAccountSetupToken,
    hashToken: hashAccountSetupToken,
    calculateExpiresAt: calculateAccountSetupExpiresAt
  };

function requireOwner(context: AuthenticatedContext): void {
  requireRole(context, [UserRole.OWNER]);
}

function createUserManagementValidationError(
  fieldErrors: Partial<Record<UserManagementField, string>>
): ValidationError<UserManagementField> {
  return new ValidationError("Dados do usuario invalidos.", fieldErrors);
}

function validateUserIdOrThrow(userIdInput: string): string {
  const validation = validateUserId(userIdInput);

  if (!validation.valid) {
    throw createUserManagementValidationError(validation.fieldErrors);
  }

  return validation.data;
}

function validateRoleOrThrow(roleInput: string): UserRole {
  const validation = validateUserRole(roleInput);

  if (!validation.valid) {
    throw createUserManagementValidationError(validation.fieldErrors);
  }

  return validation.data;
}

function getUserRoleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.OWNER:
      return "Proprietario";
    case UserRole.ADMIN:
      return "Administrador";
    case UserRole.TECHNICIAN:
      return "Tecnico";
  }
}

function getInvitationStatus(
  invitation: NonNullable<OrganizationUserRecord["invitation"]>,
  now: Date
): UserInvitationStatus {
  if (invitation.usedAt) {
    return "USED";
  }

  if (invitation.revokedAt) {
    return "REVOKED";
  }

  if (invitation.expiresAt <= now) {
    return "EXPIRED";
  }

  return "PENDING";
}

function getInvitationStatusLabel(status: UserInvitationStatus): string {
  switch (status) {
    case "PENDING":
      return "Convite pendente";
    case "EXPIRED":
      return "Convite expirado";
    case "REVOKED":
      return "Convite revogado";
    case "USED":
      return "Convite utilizado";
  }
}

function mapOrganizationUser(
  record: OrganizationUserRecord,
  currentUserId: string,
  now: Date
): OrganizationUserDto {
  const status: OrganizationUserStatus = record.disabledAt
    ? "DISABLED"
    : record.passwordHash
      ? "ACTIVE"
      : "INVITED";
  const invitationStatus = record.invitation
    ? getInvitationStatus(record.invitation, now)
    : null;

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    roleLabel: getUserRoleLabel(record.role),
    status,
    statusLabel:
      status === "ACTIVE"
        ? "Ativo"
        : status === "DISABLED"
          ? "Desativado"
          : invitationStatus
            ? getInvitationStatusLabel(invitationStatus)
            : "Configuracao pendente",
    disabledAt: record.disabledAt,
    createdAt: record.createdAt,
    isCurrentUser: record.id === currentUserId,
    invitation:
      record.invitation && invitationStatus
        ? {
            status: invitationStatus,
            statusLabel: getInvitationStatusLabel(invitationStatus),
            expiresAt: record.invitation.expiresAt,
            createdAt: record.invitation.createdAt
          }
        : null
  };
}

function mapMutationResult(
  result: OrganizationUserMutationResult,
  context: AuthenticatedContext,
  now: Date
): UserManagementOperationResult {
  if (!("user" in result)) {
    if (result.outcome === "not_found") {
      throw new NotFoundError("Usuario nao encontrado.");
    }

    if (result.outcome === "last_active_owner") {
      throw new DomainError(LAST_ACTIVE_OWNER_MESSAGE);
    }

    throw new ConflictError(USER_INVITATION_UNAVAILABLE_MESSAGE);
  }

  return {
    user: mapOrganizationUser(result.user, context.userId, now),
    changed: result.outcome === "updated",
    revokedSessionCount: result.revokedSessionCount,
    revokedInvitationCount: result.revokedInvitationCount
  };
}

function createSetupPath(token: string): string {
  return `/setup-account/${token}`;
}

export async function listUsersForOrganization(
  context: AuthenticatedContext,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<OrganizationUserDto[]> {
  requireOwner(context);
  const users = await dependencies.listOrganizationUsers(context);

  return users.map((user) => mapOrganizationUser(user, context.userId, now));
}

export async function inviteOrganizationUser(
  context: AuthenticatedContext,
  input: InviteUserInput,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<InviteOrganizationUserResult> {
  requireOwner(context);
  const validation = validateInviteUserInput(input);

  if (!validation.valid) {
    throw createUserManagementValidationError(validation.fieldErrors);
  }

  const token = dependencies.createToken();
  const tokenHash = dependencies.hashToken(token);
  const expiresAt = dependencies.calculateExpiresAt(now);

  try {
    const user = await dependencies.createInvitedUserWithInvitation(context, {
      ...validation.data,
      tokenHash,
      expiresAt
    });

    return {
      user: mapOrganizationUser(user, context.userId, now),
      setupPath: createSetupPath(token),
      expiresAt
    };
  } catch (error) {
    if (error instanceof UserInvitationConflictError) {
      throw new ConflictError(USER_INVITATION_CREATE_ERROR_MESSAGE);
    }

    throw error;
  }
}

export async function changeUserRole(
  context: AuthenticatedContext,
  userIdInput: string,
  roleInput: string,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<UserManagementOperationResult> {
  requireOwner(context);
  const userId = validateUserIdOrThrow(userIdInput);
  const role = validateRoleOrThrow(roleInput);

  if (userId === context.userId) {
    throw new AuthorizationError(SELF_ROLE_CHANGE_MESSAGE);
  }

  const result = await dependencies.changeOrganizationUserRole(
    context,
    userId,
    role
  );

  return mapMutationResult(result, context, now);
}

export async function disableOrganizationUser(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<UserManagementOperationResult> {
  requireOwner(context);
  const userId = validateUserIdOrThrow(userIdInput);

  if (userId === context.userId) {
    throw new AuthorizationError(SELF_DISABLE_MESSAGE);
  }

  const result = await dependencies.setOrganizationUserDisabled(
    context,
    userId,
    true,
    now
  );

  return mapMutationResult(result, context, now);
}

export async function reactivateOrganizationUser(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<UserManagementOperationResult> {
  requireOwner(context);
  const userId = validateUserIdOrThrow(userIdInput);
  const result = await dependencies.setOrganizationUserDisabled(
    context,
    userId,
    false,
    now
  );

  return mapMutationResult(result, context, now);
}

export async function revokeAllOrganizationUserSessions(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<UserManagementOperationResult> {
  requireOwner(context);
  const userId = validateUserIdOrThrow(userIdInput);
  const result = await dependencies.revokeOrganizationUserSessions(
    context,
    userId
  );

  return mapMutationResult(result, context, now);
}

export async function revokeUserInvitation(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<UserManagementOperationResult> {
  requireOwner(context);
  const userId = validateUserIdOrThrow(userIdInput);
  const result = await dependencies.revokeOrganizationUserInvitation(
    context,
    userId,
    now
  );

  return mapMutationResult(result, context, now);
}

export async function reissueUserInvitation(
  context: AuthenticatedContext,
  userIdInput: string,
  dependencies = defaultUserManagementServiceDependencies,
  now = new Date()
): Promise<InviteOrganizationUserResult> {
  requireOwner(context);
  const userId = validateUserIdOrThrow(userIdInput);
  const token = dependencies.createToken();
  const tokenHash = dependencies.hashToken(token);
  const expiresAt = dependencies.calculateExpiresAt(now);

  try {
    const result = await dependencies.replaceOrganizationUserInvitation(
      context,
      userId,
      {
        tokenHash,
        expiresAt,
        now
      }
    );
    const mapped = mapMutationResult(result, context, now);

    return {
      user: mapped.user,
      setupPath: createSetupPath(token),
      expiresAt
    };
  } catch (error) {
    if (error instanceof UserInvitationConflictError) {
      throw new ConflictError(
        "Nao foi possivel gerar um novo link de convite. Tente novamente."
      );
    }

    throw error;
  }
}
