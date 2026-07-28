import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";

export type SecurityCleanupRecordType =
  | "authSessions"
  | "userInvitations"
  | "passwordResetTokens"
  | "rateLimitCounters"
  | "securityAuditLogs";

export type SecurityCleanupCounts = Record<SecurityCleanupRecordType, number>;

export type SecurityCleanupCutoffs = {
  authSessions: Date;
  userInvitations: Date;
  passwordResetTokens: Date;
  rateLimitCounters: Date;
  securityAuditLogs: Date;
};

export const securityCleanupRecordTypes = [
  "authSessions",
  "userInvitations",
  "passwordResetTokens",
  "rateLimitCounters",
  "securityAuditLogs"
] as const satisfies readonly SecurityCleanupRecordType[];

export async function countEligibleSecurityRecords(
  cutoffs: SecurityCleanupCutoffs,
  database: PrismaClient = prisma
): Promise<SecurityCleanupCounts> {
  const [
    authSessions,
    userInvitations,
    passwordResetTokens,
    rateLimitCounters,
    securityAuditLogs
  ] = await Promise.all([
    database.authSession.count({
      where: {
        expiresAt: {
          lte: cutoffs.authSessions
        }
      }
    }),
    database.userInvitation.count({
      where: {
        OR: [
          {
            usedAt: {
              lte: cutoffs.userInvitations
            }
          },
          {
            revokedAt: {
              lte: cutoffs.userInvitations
            }
          },
          {
            expiresAt: {
              lte: cutoffs.userInvitations
            }
          }
        ]
      }
    }),
    database.passwordResetToken.count({
      where: {
        OR: [
          {
            usedAt: {
              lte: cutoffs.passwordResetTokens
            }
          },
          {
            revokedAt: {
              lte: cutoffs.passwordResetTokens
            }
          },
          {
            expiresAt: {
              lte: cutoffs.passwordResetTokens
            }
          }
        ]
      }
    }),
    database.rateLimitCounter.count({
      where: {
        windowExpiresAt: {
          lte: cutoffs.rateLimitCounters
        }
      }
    }),
    database.securityAuditLog.count({
      where: {
        createdAt: {
          lte: cutoffs.securityAuditLogs
        }
      }
    })
  ]);

  return {
    authSessions,
    userInvitations,
    passwordResetTokens,
    rateLimitCounters,
    securityAuditLogs
  };
}

async function deleteAuthSessionBatch(
  cutoff: Date,
  batchSize: number,
  database: PrismaClient
): Promise<number> {
  const rows = await database.$queryRaw<Array<{ id: string }>>`
    WITH candidates AS (
      SELECT "id"
      FROM "AuthSession"
      WHERE "expiresAt" <= ${cutoff}
      ORDER BY "expiresAt", "id"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "AuthSession"
    WHERE "id" IN (SELECT "id" FROM candidates)
    RETURNING "id";
  `;

  return rows.length;
}

async function deleteUserInvitationBatch(
  cutoff: Date,
  batchSize: number,
  database: PrismaClient
): Promise<number> {
  const rows = await database.$queryRaw<Array<{ id: string }>>`
    WITH candidates AS (
      SELECT "id"
      FROM "UserInvitation"
      WHERE ("usedAt" IS NOT NULL AND "usedAt" <= ${cutoff})
         OR ("revokedAt" IS NOT NULL AND "revokedAt" <= ${cutoff})
         OR "expiresAt" <= ${cutoff}
      ORDER BY "createdAt", "id"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "UserInvitation"
    WHERE "id" IN (SELECT "id" FROM candidates)
    RETURNING "id";
  `;

  return rows.length;
}

async function deletePasswordResetTokenBatch(
  cutoff: Date,
  batchSize: number,
  database: PrismaClient
): Promise<number> {
  const rows = await database.$queryRaw<Array<{ id: string }>>`
    WITH candidates AS (
      SELECT "id"
      FROM "PasswordResetToken"
      WHERE ("usedAt" IS NOT NULL AND "usedAt" <= ${cutoff})
         OR ("revokedAt" IS NOT NULL AND "revokedAt" <= ${cutoff})
         OR "expiresAt" <= ${cutoff}
      ORDER BY "createdAt", "id"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "PasswordResetToken"
    WHERE "id" IN (SELECT "id" FROM candidates)
    RETURNING "id";
  `;

  return rows.length;
}

async function deleteRateLimitCounterBatch(
  cutoff: Date,
  batchSize: number,
  database: PrismaClient
): Promise<number> {
  const rows = await database.$queryRaw<Array<{ id: string }>>`
    WITH candidates AS (
      SELECT "id"
      FROM "RateLimitCounter"
      WHERE "windowExpiresAt" <= ${cutoff}
      ORDER BY "windowExpiresAt", "id"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "RateLimitCounter"
    WHERE "id" IN (SELECT "id" FROM candidates)
    RETURNING "id";
  `;

  return rows.length;
}

async function deleteSecurityAuditLogBatch(
  cutoff: Date,
  batchSize: number,
  database: PrismaClient
): Promise<number> {
  const rows = await database.$queryRaw<Array<{ id: string }>>`
    WITH candidates AS (
      SELECT "id"
      FROM "SecurityAuditLog"
      WHERE "createdAt" <= ${cutoff}
      ORDER BY "createdAt", "id"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "SecurityAuditLog"
    WHERE "id" IN (SELECT "id" FROM candidates)
    RETURNING "id";
  `;

  return rows.length;
}

export async function deleteEligibleSecurityRecordBatch(
  recordType: SecurityCleanupRecordType,
  cutoff: Date,
  batchSize: number,
  database: PrismaClient = prisma
): Promise<number> {
  switch (recordType) {
    case "authSessions":
      return deleteAuthSessionBatch(cutoff, batchSize, database);
    case "userInvitations":
      return deleteUserInvitationBatch(cutoff, batchSize, database);
    case "passwordResetTokens":
      return deletePasswordResetTokenBatch(cutoff, batchSize, database);
    case "rateLimitCounters":
      return deleteRateLimitCounterBatch(cutoff, batchSize, database);
    case "securityAuditLogs":
      return deleteSecurityAuditLogBatch(cutoff, batchSize, database);
  }
}
