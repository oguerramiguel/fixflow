import { Prisma, UserRole, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";

export type PilotProvisioningConflict =
  | "organization_slug"
  | "owner_email";

export type PilotProvisioningRecordInput = {
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  ownerEmail: string;
  tokenHash: string;
  expiresAt: Date;
};

export type PilotProvisioningRecord = {
  organizationId: string;
  ownerUserId: string;
};

export class PilotProvisioningConflictError extends Error {
  constructor(readonly conflict: PilotProvisioningConflict) {
    super(`Pilot provisioning conflict: ${conflict}.`);
    this.name = "PilotProvisioningConflictError";
  }
}

function getUniqueConstraintConflict(
  error: Prisma.PrismaClientKnownRequestError
): PilotProvisioningConflict | null {
  const target = String(error.meta?.target ?? "").toLowerCase();

  if (target.includes("slug")) {
    return "organization_slug";
  }

  if (target.includes("email")) {
    return "owner_email";
  }

  return null;
}

export async function findPilotProvisioningConflicts(
  input: Pick<PilotProvisioningRecordInput, "organizationSlug" | "ownerEmail">,
  database: PrismaClient = prisma
): Promise<PilotProvisioningConflict[]> {
  const [organization, owner] = await Promise.all([
    database.organization.findUnique({
      where: {
        slug: input.organizationSlug
      },
      select: {
        id: true
      }
    }),
    database.user.findUnique({
      where: {
        email: input.ownerEmail
      },
      select: {
        id: true
      }
    })
  ]);
  const conflicts: PilotProvisioningConflict[] = [];

  if (organization) {
    conflicts.push("organization_slug");
  }

  if (owner) {
    conflicts.push("owner_email");
  }

  return conflicts;
}

export async function createPilotOrganizationWithOwnerInvitation(
  input: PilotProvisioningRecordInput,
  database: PrismaClient = prisma
): Promise<PilotProvisioningRecord> {
  try {
    return await database.$transaction(async (transaction) => {
      const organizationConflict = await transaction.organization.findUnique({
        where: {
          slug: input.organizationSlug
        },
        select: {
          id: true
        }
      });

      if (organizationConflict) {
        throw new PilotProvisioningConflictError("organization_slug");
      }

      const ownerConflict = await transaction.user.findUnique({
        where: {
          email: input.ownerEmail
        },
        select: {
          id: true
        }
      });

      if (ownerConflict) {
        throw new PilotProvisioningConflictError("owner_email");
      }

      const organization = await transaction.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug
        },
        select: {
          id: true
        }
      });
      const owner = await transaction.user.create({
        data: {
          organizationId: organization.id,
          name: input.ownerName,
          email: input.ownerEmail,
          passwordHash: null,
          role: UserRole.OWNER,
          disabledAt: null
        },
        select: {
          id: true
        }
      });

      await transaction.userInvitation.create({
        data: {
          organizationId: organization.id,
          userId: owner.id,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt
        }
      });

      await transaction.securityAuditLog.create({
        data: {
          eventType: securityAuditEventTypes.pilotOrganizationProvisioned,
          outcome: securityAuditOutcomes.success,
          organizationId: organization.id,
          userId: owner.id,
          metadata: {
            source: "administrative_command"
          }
        }
      });

      return {
        organizationId: organization.id,
        ownerUserId: owner.id
      };
    });
  } catch (error) {
    if (error instanceof PilotProvisioningConflictError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const conflict = getUniqueConstraintConflict(error);

      if (conflict) {
        throw new PilotProvisioningConflictError(conflict);
      }
    }

    throw error;
  }
}
