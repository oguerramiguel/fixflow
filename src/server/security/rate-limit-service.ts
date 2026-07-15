import type { SecurityRequestOrigin } from "@/server/security/request-origin";
import { globalInMemoryRateLimitStore } from "@/server/security/rate-limit-memory-store";
import { prismaRateLimitStore } from "@/server/security/rate-limit-repository";
import {
  createFixedRateLimitWindow,
  type RateLimitStore
} from "@/server/security/rate-limit-store";
import {
  RateLimitExceededError,
  type RateLimitOperation
} from "@/server/security/rate-limit-types";
import {
  recordSecurityAuditEvent,
  type SecurityAuditEventInput
} from "@/server/security/security-audit-service";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";
import {
  getSecurityRuntimeConfig,
  type SecurityRuntimeConfig
} from "@/server/security/security-env";
import { hashSecurityValue } from "@/server/security/security-hash";

export type RateLimitCheckInput = {
  operation: RateLimitOperation;
  keyParts: readonly string[];
  subjectHash?: string;
  origin: SecurityRequestOrigin;
  now?: Date;
};

export type RateLimitCheckResult = {
  allowed: boolean;
  operation: RateLimitOperation;
  keyHash: string;
  subjectHash?: string;
  originHash: string;
  limit: number;
  count: number;
  resetAt: Date;
  windowSeconds: number;
  reason?: "limit_exceeded" | "store_failure";
};

export type RateLimitServiceDependencies = {
  getConfig(): SecurityRuntimeConfig;
  getStore(config: SecurityRuntimeConfig): RateLimitStore;
  recordAuditEvent(input: SecurityAuditEventInput): Promise<void>;
  reportError(
    message: string,
    metadata: {
      operation: RateLimitOperation;
      errorName: string;
    }
  ): void;
};

const defaultRateLimitServiceDependencies: RateLimitServiceDependencies = {
  getConfig: getSecurityRuntimeConfig,
  getStore: getDefaultRateLimitStore,
  recordAuditEvent: recordSecurityAuditEvent,
  reportError: (message, metadata) => {
    console.error(message, metadata);
  }
};

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function createRateLimitKeyHash(input: RateLimitCheckInput): string {
  const keyMaterial = [
    input.operation,
    input.origin.originHash,
    ...input.keyParts
  ].join("\0");

  return hashSecurityValue(keyMaterial);
}

export function getDefaultRateLimitStore(
  config: SecurityRuntimeConfig
): RateLimitStore {
  if (config.rateLimit.store === "memory") {
    return globalInMemoryRateLimitStore;
  }

  return prismaRateLimitStore;
}

export async function checkRateLimit(
  input: RateLimitCheckInput,
  dependencies = defaultRateLimitServiceDependencies
): Promise<RateLimitCheckResult> {
  const config = dependencies.getConfig();
  const policy = config.rateLimit.policies[input.operation];
  const now = input.now ?? new Date();
  const window = createFixedRateLimitWindow(now, policy.windowSeconds);
  const keyHash = createRateLimitKeyHash(input);

  try {
    const store = dependencies.getStore(config);
    const counter = await store.increment({
      operation: input.operation,
      keyHash,
      windowStart: window.windowStart,
      windowExpiresAt: window.windowExpiresAt,
      now
    });

    return {
      allowed: counter.count <= policy.limit,
      operation: input.operation,
      keyHash,
      subjectHash: input.subjectHash,
      originHash: input.origin.originHash,
      limit: policy.limit,
      count: counter.count,
      resetAt: counter.resetAt,
      windowSeconds: policy.windowSeconds,
      reason: counter.count > policy.limit ? "limit_exceeded" : undefined
    };
  } catch (error) {
    dependencies.reportError("Rate limit store failed.", {
      operation: input.operation,
      errorName: getErrorName(error)
    });

    return {
      allowed: false,
      operation: input.operation,
      keyHash,
      subjectHash: input.subjectHash,
      originHash: input.origin.originHash,
      limit: policy.limit,
      count: policy.limit + 1,
      resetAt: window.windowExpiresAt,
      windowSeconds: policy.windowSeconds,
      reason: "store_failure"
    };
  }
}

export async function enforceRateLimit(
  input: RateLimitCheckInput,
  dependencies = defaultRateLimitServiceDependencies
): Promise<void> {
  const result = await checkRateLimit(input, dependencies);

  if (result.allowed) {
    return;
  }

  await dependencies.recordAuditEvent({
    eventType: securityAuditEventTypes.rateLimitBlocked,
    outcome: securityAuditOutcomes.blocked,
    subjectHash: result.subjectHash,
    originHash: result.originHash,
    metadata: {
      operation: result.operation,
      reason: result.reason ?? "limit_exceeded",
      limit: result.limit,
      count: result.count,
      windowSeconds: result.windowSeconds
    }
  });

  throw new RateLimitExceededError();
}
