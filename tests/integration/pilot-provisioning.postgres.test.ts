import { randomUUID } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { hashAccountSetupToken } from "@/server/auth/account-setup-token";
import {
  createPilotOrganizationWithOwnerInvitation,
  PilotProvisioningConflictError
} from "@/server/repositories/pilot-provisioning-repository";

const testDatabaseUrl = process.env.FIXFLOW_TEST_DATABASE_URL?.trim();
const describePostgres = testDatabaseUrl ? describe : describe.skip;
const createdOrganizationIds: string[] = [];
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
}

function createInput(overrides: Partial<{
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  ownerEmail: string;
  tokenHash: string;
  expiresAt: Date;
}> = {}) {
  const unique = randomUUID();

  return {
    organizationName: `Pilot ${unique}`,
    organizationSlug: `pilot-${unique}`,
    ownerName: `Owner ${unique}`,
    ownerEmail: `owner-${unique}@example.test`,
    tokenHash: hashAccountSetupToken(randomUUID().replaceAll("-", "").padEnd(43, "a").slice(0, 43)),
    expiresAt: new Date("2026-08-27T12:00:00.000Z"),
    ...overrides
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
    await database.userInvitation.deleteMany({
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
}

describePostgres("pilot provisioning PostgreSQL integration", () => {
  beforeAll(async () => {
    validateTestDatabaseUrl(testDatabaseUrl as string);
    database = new PrismaClient({
      datasourceUrl: testDatabaseUrl
    });
    await database.$connect();
  });

  afterEach(async () => {
    await cleanupCreatedOrganizations();
  });

  afterAll(async () => {
    await cleanupCreatedOrganizations();
    await database.$disconnect();
  });

  it("creates the Organization, first OWNER and invitation in one transaction", async () => {
    const rawToken = "d".repeat(43);
    const input = createInput({
      tokenHash: hashAccountSetupToken(rawToken)
    });
    const record = await createPilotOrganizationWithOwnerInvitation(
      input,
      database
    );
    createdOrganizationIds.push(record.organizationId);
    const organization = await database.organization.findUnique({
      where: {
        id: record.organizationId
      },
      include: {
        users: {
          include: {
            invitation: true
          }
        }
      }
    });
    const auditLog = await database.securityAuditLog.findFirst({
      where: {
        organizationId: record.organizationId,
        userId: record.ownerUserId,
        eventType: "PILOT_ORGANIZATION_PROVISIONED"
      }
    });

    expect(organization).toMatchObject({
      name: input.organizationName,
      slug: input.organizationSlug,
      users: [
        {
          id: record.ownerUserId,
          email: input.ownerEmail,
          passwordHash: null,
          role: UserRole.OWNER,
          disabledAt: null,
          invitation: {
            tokenHash: input.tokenHash,
            usedAt: null,
            revokedAt: null
          }
        }
      ]
    });
    expect(JSON.stringify(organization)).not.toContain(rawToken);
    expect(auditLog).toMatchObject({
      outcome: "SUCCESS",
      metadata: {
        source: "administrative_command"
      }
    });
    expect(JSON.stringify(auditLog)).not.toContain(rawToken);
  });

  it("rejects duplicate Organization slug and OWNER email", async () => {
    const firstInput = createInput();
    const first = await createPilotOrganizationWithOwnerInvitation(
      firstInput,
      database
    );
    createdOrganizationIds.push(first.organizationId);

    await expect(
      createPilotOrganizationWithOwnerInvitation(
        createInput({
          organizationSlug: firstInput.organizationSlug
        }),
        database
      )
    ).rejects.toEqual(
      new PilotProvisioningConflictError("organization_slug")
    );

    await expect(
      createPilotOrganizationWithOwnerInvitation(
        createInput({
          ownerEmail: firstInput.ownerEmail
        }),
        database
      )
    ).rejects.toEqual(new PilotProvisioningConflictError("owner_email"));
  });

  it("rolls back Organization and OWNER when invitation persistence fails", async () => {
    const collisionInput = createInput();
    const collisionRecord = await createPilotOrganizationWithOwnerInvitation(
      collisionInput,
      database
    );
    createdOrganizationIds.push(collisionRecord.organizationId);
    const rolledBackInput = createInput({
      tokenHash: collisionInput.tokenHash
    });

    await expect(
      createPilotOrganizationWithOwnerInvitation(rolledBackInput, database)
    ).rejects.toMatchObject({
      code: "P2002"
    });
    expect(
      await database.organization.findUnique({
        where: {
          slug: rolledBackInput.organizationSlug
        }
      })
    ).toBeNull();
    expect(
      await database.user.findUnique({
        where: {
          email: rolledBackInput.ownerEmail
        }
      })
    ).toBeNull();
  });
});
