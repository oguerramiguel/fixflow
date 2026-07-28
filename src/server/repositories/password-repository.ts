import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

export type PasswordCredentialRecord = {
  userId: string;
  organizationId: string;
  passwordHash: string;
};

export type PasswordChangeMutationResult = {
  userId: string;
  organizationId: string;
  revokedSessionCount: number;
};

export type CreatePasswordResetRecordInput = {
  createdByUserId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
};

export type CreatePasswordResetRecordResult =
  | {
      outcome: "created";
      userId: string;
      organizationId: string;
      revokedTokenCount: number;
    }
  | {
      outcome: "not_found" | "unavailable";
    };

export type RevokePasswordResetRecordResult =
  | {
      outcome: "updated";
      userId: string;
      organizationId: string;
      revokedTokenCount: number;
    }
  | {
      outcome: "not_found" | "unavailable";
    };

export type PasswordResetAvailabilityRecord = {
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

export type ConsumedPasswordResetRecord = {
  organizationId: string;
  userId: string;
  revokedSessionCount: number;
  revokedTokenCount: number;
};

type LockedPasswordResetUser = {
  id: string;
  passwordHash: string | null;
  disabledAt: Date | null;
};

class PasswordMutationConflictError extends Error {
  constructor() {
    super("The password mutation could not be completed.");
    this.name = "PasswordMutationConflictError";
  }
}

async function lockPasswordResetTarget(
  transaction: Prisma.TransactionClient,
  context: TenantContext,
  userId: string
): Promise<LockedPasswordResetUser | null> {
  const users = await transaction.$queryRaw<LockedPasswordResetUser[]>`
    SELECT "id", "passwordHash", "disabledAt"
    FROM "User"
    WHERE "id" = ${userId}
      AND "organizationId" = ${context.organizationId}
    FOR UPDATE;
  `;

  return users[0] ?? null;
}

function isActivePasswordUser(
  user: LockedPasswordResetUser | null
): user is LockedPasswordResetUser & { passwordHash: string } {
  return Boolean(user && user.passwordHash && user.disabledAt === null);
}

export async function findOwnPasswordCredential(
  context: TenantContext,
  userId: string,
  database: PrismaClient = prisma
): Promise<PasswordCredentialRecord | null> {
  const user = await database.user.findFirst({
    where: {
      id: userId,
      organizationId: context.organizationId,
      disabledAt: null,
      passwordHash: {
        not: null
      }
    },
    select: {
      id: true,
      organizationId: true,
      passwordHash: true
    }
  });

  if (!user?.passwordHash) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    passwordHash: user.passwordHash
  };
}

export async function changeOwnPasswordAndRevokeSessions(
  context: TenantContext,
  userId: string,
  expectedPasswordHash: string,
  newPasswordHash: string,
  database: PrismaClient = prisma
): Promise<PasswordChangeMutationResult | null> {
  return database.$transaction(async (transaction) => {
    const updateResult = await transaction.user.updateMany({
      where: {
        id: userId,
        organizationId: context.organizationId,
        passwordHash: expectedPasswordHash,
        disabledAt: null
      },
      data: {
        passwordHash: newPasswordHash
      }
    });

    if (updateResult.count === 0) {
      return null;
    }

    const deleteResult = await transaction.authSession.deleteMany({
      where: {
        userId
      }
    });

    return {
      userId,
      organizationId: context.organizationId,
      revokedSessionCount: deleteResult.count
    };
  });
}

export async function createPasswordResetForUser(
  context: TenantContext,
  input: CreatePasswordResetRecordInput,
  database: PrismaClient = prisma
): Promise<CreatePasswordResetRecordResult> {
  return database.$transaction(async (transaction) => {
    const user = await lockPasswordResetTarget(
      transaction,
      context,
      input.userId
    );

    if (!user) {
      return {
        outcome: "not_found"
      };
    }

    if (!isActivePasswordUser(user)) {
      return {
        outcome: "unavailable"
      };
    }

    const revokeResult = await transaction.passwordResetToken.updateMany({
      where: {
        organizationId: context.organizationId,
        userId: user.id,
        usedAt: null,
        revokedAt: null
      },
      data: {
        revokedAt: input.now
      }
    });

    await transaction.passwordResetToken.create({
      data: {
        organizationId: context.organizationId,
        userId: user.id,
        createdByUserId: input.createdByUserId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      },
      select: {
        id: true
      }
    });

    return {
      outcome: "created",
      userId: user.id,
      organizationId: context.organizationId,
      revokedTokenCount: revokeResult.count
    };
  });
}

export async function revokePasswordResetsForUser(
  context: TenantContext,
  userId: string,
  now: Date,
  database: PrismaClient = prisma
): Promise<RevokePasswordResetRecordResult> {
  return database.$transaction(async (transaction) => {
    const user = await lockPasswordResetTarget(transaction, context, userId);

    if (!user) {
      return {
        outcome: "not_found"
      };
    }

    if (!isActivePasswordUser(user)) {
      return {
        outcome: "unavailable"
      };
    }

    const revokeResult = await transaction.passwordResetToken.updateMany({
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

    return {
      outcome: "updated",
      userId: user.id,
      organizationId: context.organizationId,
      revokedTokenCount: revokeResult.count
    };
  });
}

export async function findPasswordResetByTokenHash(
  tokenHash: string,
  database: PrismaClient = prisma
): Promise<PasswordResetAvailabilityRecord | null> {
  return database.passwordResetToken.findUnique({
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

export async function consumePasswordReset(
  tokenHash: string,
  newPasswordHash: string,
  now: Date,
  database: PrismaClient = prisma
): Promise<ConsumedPasswordResetRecord | null> {
  try {
    return await database.$transaction(async (transaction) => {
      const reset = await transaction.passwordResetToken.findUnique({
        where: {
          tokenHash
        },
        select: {
          id: true,
          organizationId: true,
          userId: true
        }
      });

      if (!reset) {
        return null;
      }

      const user = await lockPasswordResetTarget(
        transaction,
        {
          organizationId: reset.organizationId
        },
        reset.userId
      );

      if (!isActivePasswordUser(user)) {
        return null;
      }

      const claimResult = await transaction.passwordResetToken.updateMany({
        where: {
          id: reset.id,
          organizationId: reset.organizationId,
          userId: reset.userId,
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

      const userUpdateResult = await transaction.user.updateMany({
        where: {
          id: reset.userId,
          organizationId: reset.organizationId,
          disabledAt: null,
          passwordHash: {
            not: null
          },
          organization: {
            is: {}
          }
        },
        data: {
          passwordHash: newPasswordHash
        }
      });

      if (userUpdateResult.count === 0) {
        throw new PasswordMutationConflictError();
      }

      const sessionResult = await transaction.authSession.deleteMany({
        where: {
          userId: reset.userId
        }
      });

      const tokenResult = await transaction.passwordResetToken.updateMany({
        where: {
          organizationId: reset.organizationId,
          userId: reset.userId,
          id: {
            not: reset.id
          },
          usedAt: null,
          revokedAt: null
        },
        data: {
          revokedAt: now
        }
      });

      return {
        organizationId: reset.organizationId,
        userId: reset.userId,
        revokedSessionCount: sessionResult.count,
        revokedTokenCount: tokenResult.count
      };
    });
  } catch (error) {
    if (error instanceof PasswordMutationConflictError) {
      return null;
    }

    throw error;
  }
}
