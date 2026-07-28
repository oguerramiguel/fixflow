import { randomUUID } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  afterEach,
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";
import {
  hashAccountSetupToken
} from "@/server/auth/account-setup-token";
import { hashPasswordResetToken } from "@/server/auth/password-reset-token";
import {
  consumePasswordReset,
  createPasswordResetForUser
} from "@/server/repositories/password-repository";
import {
  changeOrganizationUserRole,
  consumeAccountSetupInvitation
} from "@/server/repositories/user-management-repository";
import {
  countEligibleSecurityRecords,
  deleteEligibleSecurityRecordBatch
} from "@/server/security/security-cleanup-repository";
import {
  runSecurityCleanup,
  type SecurityCleanupServiceDependencies
} from "@/server/security/security-cleanup-service";
import type { SecurityRuntimeConfig } from "@/server/security/security-env";

const testDatabaseUrl = process.env.FIXFLOW_TEST_DATABASE_URL?.trim();
const describePostgres = testDatabaseUrl ? describe : describe.skip;
const createdOrganizationIds: string[] = [];
const testRecordPrefix = `phase-8-2b-${randomUUID()}`;
let database: PrismaClient;

function validateTestDatabaseUrl(value: string): void {
  const parsed = new URL(value);
  const normalizedProtocol =
    parsed.protocol === "postgres:" ? "postgresql:" : parsed.protocol;

  if (normalizedProtocol !== "postgresql:") {
    throw new Error("FIXFLOW_TEST_DATABASE_URL must be a PostgreSQL URL.");
  }

  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();

  if (!databaseName.includes("test")) {
    throw new Error(
      'FIXFLOW_TEST_DATABASE_URL must point to a database whose name contains "test".'
    );
  }

  const developmentDatabaseUrl = process.env.DATABASE_URL?.trim();

  if (developmentDatabaseUrl) {
    const development = new URL(developmentDatabaseUrl);
    const testIdentity = [
      parsed.hostname.toLowerCase(),
      parsed.port || "5432",
      databaseName
    ].join(":");
    const developmentIdentity = [
      development.hostname.toLowerCase(),
      development.port || "5432",
      development.pathname.replace(/^\//, "").toLowerCase()
    ].join(":");

    if (testIdentity === developmentIdentity) {
      throw new Error(
        "FIXFLOW_TEST_DATABASE_URL must not target the development database."
      );
    }
  }
}

async function createOrganizationWithUsers() {
  const unique = randomUUID();
  const organization = await database.organization.create({
    data: {
      name: `Integration ${unique}`,
      slug: `integration-${unique}`
    }
  });
  createdOrganizationIds.push(organization.id);
  const owner = await database.user.create({
    data: {
      organizationId: organization.id,
      name: "Owner",
      email: `owner-${unique}@example.test`,
      passwordHash: "owner-password-hash",
      role: UserRole.OWNER
    }
  });
  const target = await database.user.create({
    data: {
      organizationId: organization.id,
      name: "Target",
      email: `target-${unique}@example.test`,
      passwordHash: "target-password-hash",
      role: UserRole.TECHNICIAN
    }
  });

  return {
    organization,
    owner,
    target
  };
}

async function cleanupCreatedOrganizations(): Promise<void> {
  while (createdOrganizationIds.length > 0) {
    const organizationId = createdOrganizationIds.pop();

    if (!organizationId) {
      continue;
    }

    await database.securityAuditLog.deleteMany({
      where: {
        organizationId
      }
    });
    await database.passwordResetToken.deleteMany({
      where: {
        organizationId
      }
    });
    await database.userInvitation.deleteMany({
      where: {
        organizationId
      }
    });
    await database.authSession.deleteMany({
      where: {
        user: {
          organizationId
        }
      }
    });
    await database.customer.deleteMany({
      where: {
        organizationId
      }
    });
    await database.user.deleteMany({
      where: {
        organizationId
      }
    });
    await database.organization.deleteMany({
      where: {
        id: organizationId
      }
    });
  }

  await database.rateLimitCounter.deleteMany({
    where: {
      keyHash: {
        startsWith: testRecordPrefix
      }
    }
  });
}

const cleanupConfig: SecurityRuntimeConfig = {
  appEnvironment: "test",
  passwordReset: {
    tokenTtlMinutes: 30
  },
  rateLimit: {
    store: "database",
    policies: {
      LOGIN_ATTEMPT: { limit: 5, windowSeconds: 300 },
      ACCOUNT_SETUP_ATTEMPT: { limit: 5, windowSeconds: 300 },
      PASSWORD_CHANGE_ATTEMPT: { limit: 5, windowSeconds: 300 },
      PASSWORD_RESET_CREATE: { limit: 5, windowSeconds: 900 },
      PASSWORD_RESET_CONSUME: { limit: 5, windowSeconds: 300 },
      PUBLIC_PORTAL_LOOKUP: { limit: 60, windowSeconds: 60 },
      PUBLIC_QUOTE_APPROVE: { limit: 5, windowSeconds: 300 },
      PUBLIC_QUOTE_REJECT: { limit: 5, windowSeconds: 300 }
    }
  },
  audit: {
    enabled: true,
    store: "database"
  },
  retention: {
    expiredSessionDays: 1,
    closedInvitationDays: 1,
    closedPasswordResetDays: 1,
    rateLimitCounterSeconds: 86400,
    auditLogDays: 1
  },
  cleanup: {
    batchSize: 2
  }
};

describePostgres("password security with real PostgreSQL", () => {
  beforeAll(async () => {
    validateTestDatabaseUrl(testDatabaseUrl!);
    database = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    });
    await database.$connect();
    const connectedDatabase = await database.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS "name";
    `;

    if (!connectedDatabase[0]?.name.toLowerCase().includes("test")) {
      throw new Error(
        'The connected PostgreSQL database name must contain "test".'
      );
    }
  });

  afterAll(async () => {
    if (database) {
      await database.$disconnect();
    }
  });

  afterEach(async () => {
    await cleanupCreatedOrganizations();
  });

  it("allows only one concurrent password reset and revokes all sessions atomically", async () => {
    const { organization, owner, target } =
      await createOrganizationWithUsers();
    const rawToken = randomUUID().replaceAll("-", "").padEnd(43, "a").slice(0, 43);
    const tokenHash = hashPasswordResetToken(rawToken);
    const now = new Date();

    await database.authSession.createMany({
      data: [
        {
          userId: target.id,
          tokenHash: `${testRecordPrefix}-session-1-${randomUUID()}`,
          expiresAt: new Date(now.getTime() + 60_000)
        },
        {
          userId: target.id,
          tokenHash: `${testRecordPrefix}-session-2-${randomUUID()}`,
          expiresAt: new Date(now.getTime() + 60_000)
        }
      ]
    });
    await createPasswordResetForUser(
      {
        organizationId: organization.id
      },
      {
        createdByUserId: owner.id,
        userId: target.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 30 * 60_000),
        now
      },
      database
    );

    const results = await Promise.all([
      consumePasswordReset(tokenHash, "password-hash-a", now, database),
      consumePasswordReset(tokenHash, "password-hash-b", now, database)
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    await expect(
      database.authSession.count({
        where: {
          userId: target.id
        }
      })
    ).resolves.toBe(0);
    const persistedReset = await database.passwordResetToken.findUniqueOrThrow({
      where: {
        tokenHash
      }
    });
    expect(persistedReset.usedAt).not.toBeNull();
    const persistedUser = await database.user.findUniqueOrThrow({
      where: {
        id: target.id
      }
    });
    expect(["password-hash-a", "password-hash-b"]).toContain(
      persistedUser.passwordHash
    );
  });

  it("keeps reset generation tenant-aware and protects the last active OWNER", async () => {
    const first = await createOrganizationWithUsers();
    const second = await createOrganizationWithUsers();

    await expect(
      createPasswordResetForUser(
        {
          organizationId: first.organization.id
        },
        {
          createdByUserId: first.owner.id,
          userId: second.target.id,
          tokenHash: hashPasswordResetToken("b".repeat(43)),
          expiresAt: new Date(Date.now() + 30 * 60_000),
          now: new Date()
        },
        database
      )
    ).resolves.toEqual({
      outcome: "not_found"
    });

    await expect(
      changeOrganizationUserRole(
        {
          organizationId: first.organization.id
        },
        first.owner.id,
        UserRole.ADMIN,
        database
      )
    ).resolves.toEqual({
      outcome: "last_active_owner"
    });
  });

  it("allows only one concurrent invitation consumption", async () => {
    const { organization } = await createOrganizationWithUsers();
    const unique = randomUUID();
    const invitedUser = await database.user.create({
      data: {
        organizationId: organization.id,
        name: "Invited",
        email: `invited-${unique}@example.test`,
        passwordHash: null,
        role: UserRole.TECHNICIAN
      }
    });
    const rawToken = "c".repeat(43);
    const tokenHash = hashAccountSetupToken(rawToken);
    const now = new Date();
    await database.userInvitation.create({
      data: {
        organizationId: organization.id,
        userId: invitedUser.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 60_000)
      }
    });

    const results = await Promise.all([
      consumeAccountSetupInvitation(
        tokenHash,
        "invitation-password-hash-a",
        now,
        database
      ),
      consumeAccountSetupInvitation(
        tokenHash,
        "invitation-password-hash-b",
        now,
        database
      )
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("supports dry-run, bounded cleanup, retention preservation and idempotency without deleting business data", async () => {
    const { organization, owner, target } =
      await createOrganizationWithUsers();
    const now = new Date();
    const old = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const recent = new Date(now.getTime() + 60 * 60 * 1000);
    const invitedUser = await database.user.create({
      data: {
        organizationId: organization.id,
        name: "Invited cleanup",
        email: `cleanup-${randomUUID()}@example.test`,
        passwordHash: null,
        role: UserRole.TECHNICIAN
      }
    });
    const customer = await database.customer.create({
      data: {
        organizationId: organization.id,
        name: "Preserved customer",
        phone: "11999999999"
      }
    });

    await database.authSession.createMany({
      data: [
        {
          userId: target.id,
          tokenHash: `${testRecordPrefix}-expired-${randomUUID()}`,
          expiresAt: old
        },
        {
          userId: target.id,
          tokenHash: `${testRecordPrefix}-recent-${randomUUID()}`,
          expiresAt: recent
        }
      ]
    });
    await database.userInvitation.create({
      data: {
        organizationId: organization.id,
        userId: invitedUser.id,
        tokenHash: hashAccountSetupToken("d".repeat(43)),
        expiresAt: old
      }
    });
    await database.passwordResetToken.createMany({
      data: [
        {
          organizationId: organization.id,
          userId: target.id,
          createdByUserId: owner.id,
          tokenHash: hashPasswordResetToken("e".repeat(43)),
          expiresAt: old,
          usedAt: old
        },
        {
          organizationId: organization.id,
          userId: target.id,
          createdByUserId: owner.id,
          tokenHash: hashPasswordResetToken("f".repeat(43)),
          expiresAt: recent
        }
      ]
    });
    await database.rateLimitCounter.createMany({
      data: [
        {
          operation: "INTEGRATION_TEST",
          keyHash: `${testRecordPrefix}-old-${randomUUID()}`,
          windowStart: old,
          windowExpiresAt: old,
          count: 1
        },
        {
          operation: "INTEGRATION_TEST",
          keyHash: `${testRecordPrefix}-new-${randomUUID()}`,
          windowStart: now,
          windowExpiresAt: recent,
          count: 1
        }
      ]
    });
    await database.securityAuditLog.createMany({
      data: [
        {
          eventType: "INTEGRATION_TEST",
          outcome: "SUCCESS",
          organizationId: organization.id,
          createdAt: old
        },
        {
          eventType: "INTEGRATION_TEST",
          outcome: "SUCCESS",
          organizationId: organization.id,
          createdAt: now
        }
      ]
    });

    const dependencies: SecurityCleanupServiceDependencies = {
      getConfig: () => cleanupConfig,
      countEligibleRecords: (cutoffs) =>
        countEligibleSecurityRecords(cutoffs, database),
      deleteEligibleBatch: (recordType, cutoff, batchSize) =>
        deleteEligibleSecurityRecordBatch(
          recordType,
          cutoff,
          batchSize,
          database
        ),
      recordAuditEvent: async () => undefined
    };

    const dryRun = await runSecurityCleanup(
      {
        dryRun: true,
        now
      },
      dependencies
    );
    expect(dryRun.counts.authSessions).toBeGreaterThanOrEqual(1);
    await expect(
      database.authSession.count({
        where: {
          userId: target.id
        }
      })
    ).resolves.toBe(2);

    const first = await runSecurityCleanup(
      {
        dryRun: false,
        now
      },
      dependencies
    );
    const second = await runSecurityCleanup(
      {
        dryRun: false,
        now
      },
      dependencies
    );

    expect(first.counts.authSessions).toBeGreaterThanOrEqual(1);
    expect(second.counts).toEqual({
      authSessions: 0,
      userInvitations: 0,
      passwordResetTokens: 0,
      rateLimitCounters: 0,
      securityAuditLogs: 0
    });
    await expect(
      database.authSession.count({
        where: {
          userId: target.id
        }
      })
    ).resolves.toBe(1);
    await expect(
      database.passwordResetToken.count({
        where: {
          organizationId: organization.id
        }
      })
    ).resolves.toBe(1);
    await expect(
      database.customer.findUnique({
        where: {
          id: customer.id
        }
      })
    ).resolves.not.toBeNull();
    await expect(
      database.user.count({
        where: {
          organizationId: organization.id
        }
      })
    ).resolves.toBe(3);
  });
});
