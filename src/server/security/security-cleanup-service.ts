import {
  countEligibleSecurityRecords,
  deleteEligibleSecurityRecordBatch,
  securityCleanupRecordTypes,
  type SecurityCleanupCounts,
  type SecurityCleanupCutoffs,
  type SecurityCleanupRecordType
} from "./security-cleanup-repository";
import {
  recordSecurityAuditEvent,
  type SecurityAuditEventInput
} from "./security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "./security-audit-types";
import {
  getSecurityRuntimeConfig,
  type SecurityRuntimeConfig
} from "./security-env";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RunSecurityCleanupInput = {
  dryRun: boolean;
  now?: Date;
};

export type SecurityCleanupResult = {
  dryRun: boolean;
  batchSize: number;
  cutoffs: SecurityCleanupCutoffs;
  counts: SecurityCleanupCounts;
};

export type SecurityCleanupServiceDependencies = {
  getConfig(): SecurityRuntimeConfig;
  countEligibleRecords(
    cutoffs: SecurityCleanupCutoffs
  ): Promise<SecurityCleanupCounts>;
  deleteEligibleBatch(
    recordType: SecurityCleanupRecordType,
    cutoff: Date,
    batchSize: number
  ): Promise<number>;
  recordAuditEvent(input: SecurityAuditEventInput): Promise<void>;
};

const defaultSecurityCleanupServiceDependencies: SecurityCleanupServiceDependencies =
  {
    getConfig: getSecurityRuntimeConfig,
    countEligibleRecords: countEligibleSecurityRecords,
    deleteEligibleBatch: deleteEligibleSecurityRecordBatch,
    recordAuditEvent: recordSecurityAuditEvent
  };

function subtractDays(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function createCutoffs(
  now: Date,
  config: SecurityRuntimeConfig
): SecurityCleanupCutoffs {
  return {
    authSessions: subtractDays(now, config.retention.expiredSessionDays),
    userInvitations: subtractDays(
      now,
      config.retention.closedInvitationDays
    ),
    passwordResetTokens: subtractDays(
      now,
      config.retention.closedPasswordResetDays
    ),
    rateLimitCounters: new Date(
      now.getTime() - config.retention.rateLimitCounterSeconds * 1000
    ),
    securityAuditLogs: subtractDays(now, config.retention.auditLogDays)
  };
}

function createEmptyCounts(): SecurityCleanupCounts {
  return {
    authSessions: 0,
    userInvitations: 0,
    passwordResetTokens: 0,
    rateLimitCounters: 0,
    securityAuditLogs: 0
  };
}

async function deleteAllEligibleRecords(
  cutoffs: SecurityCleanupCutoffs,
  batchSize: number,
  dependencies: SecurityCleanupServiceDependencies
): Promise<SecurityCleanupCounts> {
  const counts = createEmptyCounts();

  for (const recordType of securityCleanupRecordTypes) {
    while (true) {
      const deletedCount = await dependencies.deleteEligibleBatch(
        recordType,
        cutoffs[recordType],
        batchSize
      );
      counts[recordType] += deletedCount;

      if (deletedCount < batchSize) {
        break;
      }
    }
  }

  return counts;
}

function createAuditMetadata(
  result: Pick<SecurityCleanupResult, "dryRun" | "batchSize" | "counts">
) {
  return {
    dryRun: result.dryRun,
    batchSize: result.batchSize,
    authRecords: result.counts.authSessions,
    invitationRecords: result.counts.userInvitations,
    resetRecords: result.counts.passwordResetTokens,
    rateLimitRecords: result.counts.rateLimitCounters,
    auditRecords: result.counts.securityAuditLogs
  };
}

export async function runSecurityCleanup(
  input: RunSecurityCleanupInput,
  dependencies = defaultSecurityCleanupServiceDependencies
): Promise<SecurityCleanupResult> {
  const config = dependencies.getConfig();
  const now = input.now ?? new Date();
  const cutoffs = createCutoffs(now, config);

  try {
    const counts = input.dryRun
      ? await dependencies.countEligibleRecords(cutoffs)
      : await deleteAllEligibleRecords(
          cutoffs,
          config.cleanup.batchSize,
          dependencies
        );
    const result: SecurityCleanupResult = {
      dryRun: input.dryRun,
      batchSize: config.cleanup.batchSize,
      cutoffs,
      counts
    };

    await dependencies.recordAuditEvent({
      eventType: securityAuditEventTypes.securityCleanupExecuted,
      outcome: securityAuditOutcomes.success,
      metadata: createAuditMetadata(result)
    });

    return result;
  } catch (error) {
    await dependencies.recordAuditEvent({
      eventType: securityAuditEventTypes.securityCleanupExecuted,
      outcome: securityAuditOutcomes.failure,
      metadata: {
        dryRun: input.dryRun,
        errorName: error instanceof Error ? error.name : "UnknownError"
      }
    });

    throw error;
  }
}
