import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type {
  SecurityAuditEventType,
  SecurityAuditOutcome
} from "@/server/security/security-audit-types";

export type CreateSecurityAuditLogRecordInput = {
  eventType: SecurityAuditEventType;
  outcome: SecurityAuditOutcome;
  organizationId?: string;
  userId?: string;
  subjectHash?: string;
  originHash?: string;
  metadata?: Prisma.InputJsonObject;
};

export async function createSecurityAuditLogRecord(
  input: CreateSecurityAuditLogRecordInput
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  await prisma.$executeRaw`
    INSERT INTO "SecurityAuditLog" (
      "id",
      "eventType",
      "outcome",
      "organizationId",
      "userId",
      "subjectHash",
      "originHash",
      "metadata",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.eventType},
      ${input.outcome},
      ${input.organizationId ?? null},
      ${input.userId ?? null},
      ${input.subjectHash ?? null},
      ${input.originHash ?? null},
      ${metadata}::jsonb,
      CURRENT_TIMESTAMP
    );
  `;
}
