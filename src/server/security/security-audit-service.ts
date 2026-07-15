import type { Prisma } from "@prisma/client";
import {
  createSecurityAuditLogRecord,
  type CreateSecurityAuditLogRecordInput
} from "@/server/security/security-audit-repository";
import type {
  SecurityAuditEventType,
  SecurityAuditOutcome
} from "@/server/security/security-audit-types";
import { getSecurityRuntimeConfig } from "@/server/security/security-env";

export type SecurityAuditMetadataValue = string | number | boolean | null;
export type SecurityAuditMetadata = Record<
  string,
  SecurityAuditMetadataValue | undefined
>;

export type SecurityAuditEventInput = {
  eventType: SecurityAuditEventType;
  outcome: SecurityAuditOutcome;
  organizationId?: string;
  userId?: string;
  subjectHash?: string;
  originHash?: string;
  metadata?: SecurityAuditMetadata;
};

export type SecurityAuditServiceDependencies = {
  createSecurityAuditLog(
    input: CreateSecurityAuditLogRecordInput
  ): Promise<void>;
  getConfig(): ReturnType<typeof getSecurityRuntimeConfig>;
  reportError(
    message: string,
    metadata: {
      eventType?: SecurityAuditEventType;
      outcome?: SecurityAuditOutcome;
      errorName?: string;
    }
  ): void;
};

const forbiddenMetadataKeyPattern =
  /(password|passwordHash|cookie|token|tokenHash|session|publicCode|authorization|secret)/i;

const defaultSecurityAuditServiceDependencies: SecurityAuditServiceDependencies =
  {
    createSecurityAuditLog: createSecurityAuditLogRecord,
    getConfig: getSecurityRuntimeConfig,
    reportError: (message, metadata) => {
      console.error(message, metadata);
    }
  };

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export function sanitizeSecurityAuditMetadata(
  metadata: SecurityAuditMetadata | undefined
): Prisma.InputJsonObject | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(metadata).flatMap(([key, value]) => {
    if (value === undefined || forbiddenMetadataKeyPattern.test(key)) {
      return [];
    }

    return [[key, value] as const];
  });

  if (sanitizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(sanitizedEntries);
}

export async function recordSecurityAuditEvent(
  input: SecurityAuditEventInput,
  dependencies = defaultSecurityAuditServiceDependencies
): Promise<void> {
  let config: ReturnType<typeof getSecurityRuntimeConfig>;

  try {
    config = dependencies.getConfig();
  } catch (error) {
    dependencies.reportError("Security audit configuration failed.", {
      eventType: input.eventType,
      outcome: input.outcome,
      errorName: getErrorName(error)
    });
    return;
  }

  if (!config.audit.enabled) {
    return;
  }

  try {
    await dependencies.createSecurityAuditLog({
      eventType: input.eventType,
      outcome: input.outcome,
      organizationId: input.organizationId,
      userId: input.userId,
      subjectHash: input.subjectHash,
      originHash: input.originHash,
      metadata: sanitizeSecurityAuditMetadata(input.metadata)
    });
  } catch (error) {
    dependencies.reportError("Security audit log write failed.", {
      eventType: input.eventType,
      outcome: input.outcome,
      errorName: getErrorName(error)
    });
  }
}
