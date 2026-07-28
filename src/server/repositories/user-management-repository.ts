import { Prisma, UserRole, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const organizationUserSelect = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
  role: true,
  disabledAt: true,
  createdAt: true,
  invitation: {
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      createdAt: true
    }
  }
} satisfies Prisma.UserSelect;

export type OrganizationUserRecord = Prisma.UserGetPayload<{
  select: typeof organizationUserSelect;
}>;

export type CreateInvitedUserRecordInput = {
  name: string;
  email: string;
  role: UserRole;
  tokenHash: string;
  expiresAt: Date;
};

export type ReplaceInvitationRecordInput = {
  tokenHash: string;
  expiresAt: Date;
  now: Date;
};

export type OrganizationUserMutationResult =
  | {
      outcome: "updated" | "unchanged";
      user: OrganizationUserRecord;
      revokedSessionCount: number;
      revokedInvitationCount: number;
    }
  | {
      outcome: "not_found" | "last_active_owner" | "invitation_unavailable";
    };

export type AccountSetupInvitationRecord = {
  id: string;
  organizationId: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  user: {
    passwordHash: string | null;
    disabledAt: Date | null;
  };
};

export type ConsumedAccountSetupInvitation = {
  organizationId: string;
  userId: string;
  role: UserRole;
};

export class UserInvitationConflictError extends Error {
  constructor() {
    super("The user invitation could not be created.");
    this.name = "UserInvitationConflictError";
  }
}

class AccountSetupActivationConflictError extends Error {
  constructor() {
    super("The invited account could not be activated.");
    this.name = "AccountSetupActivationConflictError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function lockOrganizationForUserManagement(
  transaction: Prisma.TransactionClient,
  organizationId: string
): Promise<boolean> {
  const organizations = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Organization"
    WHERE "id" = ${organizationId}
    FOR UPDATE;
  `;

  return organizations.length === 1;
}

async function findOrganizationUserInTransaction(
  transaction: Prisma.TransactionClient,
  context: TenantContext,
  userId: string
): Promise<OrganizationUserRecord | null> {
  return transaction.user.findFirst({
    where: {
      id: userId,
      organizationId: context.organizationId
    },
    select: organizationUserSelect
  });
}

async function countActiveOwners(
  transaction: Prisma.TransactionClient,
  context: TenantContext
): Promise<number> {
  return transaction.user.count({
    where: {
      organizationId: context.organizationId,
      role: UserRole.OWNER,
      disabledAt: null,
      passwordHash: {
        not: null
      }
    }
  });
}

function createUpdatedResult(
  user: OrganizationUserRecord,
  input: {
    outcome?: "updated" | "unchanged";
    revokedSessionCount?: number;
    revokedInvitationCount?: number;
  } = {}
): OrganizationUserMutationResult {
  return {
    outcome: input.outcome ?? "updated",
    user,
    revokedSessionCount: input.revokedSessionCount ?? 0,
    revokedInvitationCount: input.revokedInvitationCount ?? 0
  };
}

export async function listOrganizationUsers(
  context: TenantContext
): Promise<OrganizationUserRecord[]> {
  return prisma.user.findMany({
    where: {
      organizationId: context.organizationId
    },
    select: organizationUserSelect,
    orderBy: [
      {
        createdAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });
}

export async function createInvitedUserWithInvitation(
  context: TenantContext,
  input: CreateInvitedUserRecordInput
): Promise<OrganizationUserRecord> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const organizationExists = await lockOrganizationForUserManagement(
        transaction,
        context.organizationId
      );

      if (!organizationExists) {
        throw new UserInvitationConflictError();
      }

      const user = await transaction.user.create({
        data: {
          organizationId: context.organizationId,
          name: input.name,
          email: input.email,
          passwordHash: null,
          role: input.role,
          disabledAt: null
        },
        select: {
          id: true
        }
      });

      await transaction.userInvitation.create({
        data: {
          organizationId: context.organizationId,
          userId: user.id,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt
        }
      });

      const invitedUser = await findOrganizationUserInTransaction(
        transaction,
        context,
        user.id
      );

      if (!invitedUser) {
        throw new Error("Invited user was not found after creation.");
      }

      return invitedUser;
    });
  } catch (error) {
    if (
      error instanceof UserInvitationConflictError ||
      isUniqueConstraintError(error)
    ) {
      throw new UserInvitationConflictError();
    }

    throw error;
  }
}

export async function changeOrganizationUserRole(
  context: TenantContext,
  userId: string,
  role: UserRole,
  database: PrismaClient = prisma
): Promise<OrganizationUserMutationResult> {
  return database.$transaction(async (transaction) => {
    const organizationExists = await lockOrganizationForUserManagement(
      transaction,
      context.organizationId
    );

    if (!organizationExists) {
      return {
        outcome: "not_found"
      };
    }

    const user = await findOrganizationUserInTransaction(
      transaction,
      context,
      userId
    );

    if (!user) {
      return {
        outcome: "not_found"
      };
    }

    if (user.role === role) {
      return createUpdatedResult(user, {
        outcome: "unchanged"
      });
    }

    const removesActiveOwner =
      user.role === UserRole.OWNER &&
      role !== UserRole.OWNER &&
      user.disabledAt === null &&
      user.passwordHash !== null;

    if (removesActiveOwner && (await countActiveOwners(transaction, context)) <= 1) {
      return {
        outcome: "last_active_owner"
      };
    }

    await transaction.user.update({
      where: {
        id_organizationId: {
          id: user.id,
          organizationId: context.organizationId
        }
      },
      data: {
        role
      }
    });

    const updatedUser = await findOrganizationUserInTransaction(
      transaction,
      context,
      user.id
    );

    if (!updatedUser) {
      throw new Error("User was not found after role change.");
    }

    return createUpdatedResult(updatedUser);
  });
}

export async function setOrganizationUserDisabled(
  context: TenantContext,
  userId: string,
  disabled: boolean,
  now: Date
): Promise<OrganizationUserMutationResult> {
  return prisma.$transaction(async (transaction) => {
    const organizationExists = await lockOrganizationForUserManagement(
      transaction,
      context.organizationId
    );

    if (!organizationExists) {
      return {
        outcome: "not_found"
      };
    }

    const user = await findOrganizationUserInTransaction(
      transaction,
      context,
      userId
    );

    if (!user) {
      return {
        outcome: "not_found"
      };
    }

    if (disabled === (user.disabledAt !== null)) {
      return createUpdatedResult(user, {
        outcome: "unchanged"
      });
    }

    const removesActiveOwner =
      disabled &&
      user.role === UserRole.OWNER &&
      user.passwordHash !== null &&
      user.disabledAt === null;

    if (removesActiveOwner && (await countActiveOwners(transaction, context)) <= 1) {
      return {
        outcome: "last_active_owner"
      };
    }

    await transaction.user.update({
      where: {
        id_organizationId: {
          id: user.id,
          organizationId: context.organizationId
        }
      },
      data: {
        disabledAt: disabled ? now : null
      }
    });

    let revokedSessionCount = 0;
    let revokedInvitationCount = 0;

    if (disabled) {
      const sessionResult = await transaction.authSession.deleteMany({
        where: {
          userId: user.id
        }
      });
      revokedSessionCount = sessionResult.count;

      const invitationResult = await transaction.userInvitation.updateMany({
        where: {
          organizationId: context.organizationId,
          userId: user.id,
          usedAt: null,
          revokedAt: null
        },
        data: {
          revokedAt: now
        }
      });
      revokedInvitationCount = invitationResult.count;
    }

    const updatedUser = await findOrganizationUserInTransaction(
      transaction,
      context,
      user.id
    );

    if (!updatedUser) {
      throw new Error("User was not found after active state change.");
    }

    return createUpdatedResult(updatedUser, {
      revokedSessionCount,
      revokedInvitationCount
    });
  });
}

export async function revokeOrganizationUserSessions(
  context: TenantContext,
  userId: string
): Promise<OrganizationUserMutationResult> {
  return prisma.$transaction(async (transaction) => {
    const user = await findOrganizationUserInTransaction(
      transaction,
      context,
      userId
    );

    if (!user) {
      return {
        outcome: "not_found"
      };
    }

    const deleteResult = await transaction.authSession.deleteMany({
      where: {
        userId: user.id
      }
    });

    return createUpdatedResult(user, {
      revokedSessionCount: deleteResult.count
    });
  });
}

export async function revokeOrganizationUserInvitation(
  context: TenantContext,
  userId: string,
  now: Date
): Promise<OrganizationUserMutationResult> {
  return prisma.$transaction(async (transaction) => {
    const user = await findOrganizationUserInTransaction(
      transaction,
      context,
      userId
    );

    if (!user) {
      return {
        outcome: "not_found"
      };
    }

    const updateResult = await transaction.userInvitation.updateMany({
      where: {
        organizationId: context.organizationId,
        userId: user.id,
        usedAt: null,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });

    if (updateResult.count === 0) {
      return {
        outcome: "invitation_unavailable"
      };
    }

    const updatedUser = await findOrganizationUserInTransaction(
      transaction,
      context,
      user.id
    );

    if (!updatedUser) {
      throw new Error("User was not found after invitation revocation.");
    }

    return createUpdatedResult(updatedUser, {
      revokedInvitationCount: updateResult.count
    });
  });
}

export async function replaceOrganizationUserInvitation(
  context: TenantContext,
  userId: string,
  input: ReplaceInvitationRecordInput
): Promise<OrganizationUserMutationResult> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await findOrganizationUserInTransaction(
        transaction,
        context,
        userId
      );

      if (!user) {
        return {
          outcome: "not_found"
        };
      }

      if (
        user.passwordHash !== null ||
        user.disabledAt !== null ||
        user.invitation?.usedAt != null ||
        (user.invitation &&
          user.invitation.revokedAt === null &&
          user.invitation.expiresAt > input.now)
      ) {
        return {
          outcome: "invitation_unavailable"
        };
      }

      if (!user.invitation) {
        await transaction.userInvitation.create({
          data: {
            organizationId: context.organizationId,
            userId: user.id,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt
          }
        });

        const recreatedUser = await findOrganizationUserInTransaction(
          transaction,
          context,
          user.id
        );

        if (!recreatedUser) {
          throw new Error("User was not found after invitation recreation.");
        }

        return createUpdatedResult(recreatedUser);
      }

      const updateResult = await transaction.userInvitation.updateMany({
        where: {
          id: user.invitation.id,
          organizationId: context.organizationId,
          userId: user.id,
          usedAt: null,
          OR: [
            {
              revokedAt: {
                not: null
              }
            },
            {
              expiresAt: {
                lte: input.now
              }
            }
          ]
        },
        data: {
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          revokedAt: null,
          updatedAt: input.now
        }
      });

      if (updateResult.count === 0) {
        return {
          outcome: "invitation_unavailable"
        };
      }

      const updatedUser = await findOrganizationUserInTransaction(
        transaction,
        context,
        user.id
      );

      if (!updatedUser) {
        throw new Error("User was not found after invitation replacement.");
      }

      return createUpdatedResult(updatedUser);
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new UserInvitationConflictError();
    }

    throw error;
  }
}

export async function findAccountSetupInvitationByTokenHash(
  tokenHash: string
): Promise<AccountSetupInvitationRecord | null> {
  return prisma.userInvitation.findUnique({
    where: {
      tokenHash
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      user: {
        select: {
          passwordHash: true,
          disabledAt: true
        }
      }
    }
  });
}

export async function consumeAccountSetupInvitation(
  tokenHash: string,
  passwordHash: string,
  now: Date,
  database: PrismaClient = prisma
): Promise<ConsumedAccountSetupInvitation | null> {
  try {
    return await database.$transaction(async (transaction) => {
      const claimResult = await transaction.userInvitation.updateMany({
        where: {
          tokenHash,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now
          }
        },
        data: {
          usedAt: now
        }
      });

      if (claimResult.count === 0) {
        return null;
      }

      const invitation = await transaction.userInvitation.findUnique({
        where: {
          tokenHash
        },
        select: {
          organizationId: true,
          userId: true
        }
      });

      if (!invitation) {
        throw new AccountSetupActivationConflictError();
      }

      const userUpdateResult = await transaction.user.updateMany({
        where: {
          id: invitation.userId,
          organizationId: invitation.organizationId,
          passwordHash: null,
          disabledAt: null,
          organization: {
            is: {}
          }
        },
        data: {
          passwordHash
        }
      });

      if (userUpdateResult.count === 0) {
        throw new AccountSetupActivationConflictError();
      }

      const user = await transaction.user.findFirst({
        where: {
          id: invitation.userId,
          organizationId: invitation.organizationId
        },
        select: {
          role: true
        }
      });

      if (!user) {
        throw new AccountSetupActivationConflictError();
      }

      return {
        organizationId: invitation.organizationId,
        userId: invitation.userId,
        role: user.role
      };
    });
  } catch (error) {
    if (error instanceof AccountSetupActivationConflictError) {
      return null;
    }

    throw error;
  }
}
