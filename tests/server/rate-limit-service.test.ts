import { describe, expect, it, vi } from "vitest";
import { createSecurityRequestOrigin } from "@/server/security/request-origin";
import { InMemoryRateLimitStore } from "@/server/security/rate-limit-memory-store";
import {
  checkRateLimit,
  enforceRateLimit,
  type RateLimitServiceDependencies
} from "@/server/security/rate-limit-service";
import type { RateLimitStore } from "@/server/security/rate-limit-store";
import {
  RateLimitExceededError,
  rateLimitOperations,
  type RateLimitOperation,
  type RateLimitPolicy
} from "@/server/security/rate-limit-types";
import {
  securityAuditEventTypes,
  securityAuditOutcomes
} from "@/server/security/security-audit-types";
import type { SecurityRuntimeConfig } from "@/server/security/security-env";
import { hashSecurityValue } from "@/server/security/security-hash";
import {
  createLoginSecuritySubject,
  createPublicCodeSecuritySubject
} from "@/server/security/security-identifiers";

const origin = createSecurityRequestOrigin({
  forwardedFor: "203.0.113.10",
  userAgent: "Vitest"
});

function createConfig(
  overrides: Partial<Record<RateLimitOperation, RateLimitPolicy>> = {}
): SecurityRuntimeConfig {
  return {
    appEnvironment: "test",
    rateLimit: {
      store: "memory",
      policies: {
        [rateLimitOperations.loginAttempt]: {
          limit: 2,
          windowSeconds: 60
        },
        [rateLimitOperations.publicPortalLookup]: {
          limit: 1,
          windowSeconds: 60
        },
        [rateLimitOperations.publicQuoteApprove]: {
          limit: 1,
          windowSeconds: 60
        },
        [rateLimitOperations.publicQuoteReject]: {
          limit: 1,
          windowSeconds: 60
        },
        ...overrides
      }
    },
    audit: {
      enabled: true,
      store: "database"
    }
  };
}

function createDependencies(
  store: RateLimitStore,
  config = createConfig()
): RateLimitServiceDependencies {
  return {
    getConfig: () => config,
    getStore: () => store,
    recordAuditEvent: vi.fn(async () => undefined),
    reportError: vi.fn()
  };
}

describe("rate limit service", () => {
  it("allows login attempts within the configured limit", async () => {
    const store = new InMemoryRateLimitStore();
    const dependencies = createDependencies(store);
    const subject = createLoginSecuritySubject("owner@example.com");

    await expect(
      enforceRateLimit(
        {
          operation: rateLimitOperations.loginAttempt,
          keyParts: [subject.subjectHash],
          subjectHash: subject.subjectHash,
          origin,
          now: new Date("2026-07-14T12:00:00.000Z")
        },
        dependencies
      )
    ).resolves.toBeUndefined();
    await expect(
      enforceRateLimit(
        {
          operation: rateLimitOperations.loginAttempt,
          keyParts: [subject.subjectHash],
          subjectHash: subject.subjectHash,
          origin,
          now: new Date("2026-07-14T12:00:05.000Z")
        },
        dependencies
      )
    ).resolves.toBeUndefined();
  });

  it("blocks login attempts after the configured limit with generic audit metadata", async () => {
    const store = new InMemoryRateLimitStore();
    const dependencies = createDependencies(store);
    const subject = createLoginSecuritySubject("owner@example.com");
    const input = {
      operation: rateLimitOperations.loginAttempt,
      keyParts: [subject.subjectHash],
      subjectHash: subject.subjectHash,
      origin,
      now: new Date("2026-07-14T12:00:00.000Z")
    };

    await enforceRateLimit(input, dependencies);
    await enforceRateLimit(input, dependencies);
    await expect(enforceRateLimit(input, dependencies)).rejects.toThrow(
      RateLimitExceededError
    );

    expect(dependencies.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: securityAuditEventTypes.rateLimitBlocked,
        outcome: securityAuditOutcomes.blocked,
        subjectHash: subject.subjectHash,
        originHash: origin.originHash
      })
    );
    expect(JSON.stringify(store.snapshot())).not.toContain("owner@example.com");
    expect(
      JSON.stringify(vi.mocked(dependencies.recordAuditEvent).mock.calls)
    ).not.toContain(
      "valid-password-123"
    );
  });

  it("is deterministic across fixed windows in tests", async () => {
    const store = new InMemoryRateLimitStore();
    const dependencies = createDependencies(store);
    const subject = createLoginSecuritySubject("owner@example.com");

    await enforceRateLimit(
      {
        operation: rateLimitOperations.loginAttempt,
        keyParts: [subject.subjectHash],
        subjectHash: subject.subjectHash,
        origin,
        now: new Date("2026-07-14T12:00:00.000Z")
      },
      dependencies
    );
    await enforceRateLimit(
      {
        operation: rateLimitOperations.loginAttempt,
        keyParts: [subject.subjectHash],
        subjectHash: subject.subjectHash,
        origin,
        now: new Date("2026-07-14T12:01:00.000Z")
      },
      dependencies
    );

    expect(store.snapshot()).toHaveLength(1);
    expect(store.snapshot()[0].count).toBe(1);
  });

  it("blocks public portal lookup after exceeding its own limit without storing raw publicCode", async () => {
    const store = new InMemoryRateLimitStore();
    const dependencies = createDependencies(store);
    const subject = createPublicCodeSecuritySubject("FF-ABCDEFG234");
    const input = {
      operation: rateLimitOperations.publicPortalLookup,
      keyParts: [],
      subjectHash: subject.subjectHash,
      origin,
      now: new Date("2026-07-14T12:00:00.000Z")
    };

    await enforceRateLimit(input, dependencies);
    await expect(enforceRateLimit(input, dependencies)).rejects.toThrow(
      RateLimitExceededError
    );

    expect(JSON.stringify(store.snapshot())).not.toContain("FF-ABCDEFG234");
  });

  it("allows approve and reject limits independently before blocking repeated decisions", async () => {
    const store = new InMemoryRateLimitStore();
    const dependencies = createDependencies(store);
    const subject = createPublicCodeSecuritySubject("FF-ABCDEFG234");
    const baseInput = {
      keyParts: [subject.subjectHash],
      subjectHash: subject.subjectHash,
      origin,
      now: new Date("2026-07-14T12:00:00.000Z")
    };

    await enforceRateLimit(
      {
        ...baseInput,
        operation: rateLimitOperations.publicQuoteApprove
      },
      dependencies
    );
    await enforceRateLimit(
      {
        ...baseInput,
        operation: rateLimitOperations.publicQuoteReject
      },
      dependencies
    );
    await expect(
      enforceRateLimit(
        {
          ...baseInput,
          operation: rateLimitOperations.publicQuoteApprove
        },
        dependencies
      )
    ).rejects.toThrow(RateLimitExceededError);
  });

  it("keeps rate limit buckets isolated when organization id is part of the key", async () => {
    const store = new InMemoryRateLimitStore();
    const dependencies = createDependencies(store);
    const now = new Date("2026-07-14T12:00:00.000Z");

    await enforceRateLimit(
      {
        operation: rateLimitOperations.loginAttempt,
        keyParts: [hashSecurityValue("org-1"), hashSecurityValue("same-user")],
        origin,
        now
      },
      dependencies
    );
    await expect(
      enforceRateLimit(
        {
          operation: rateLimitOperations.loginAttempt,
          keyParts: [hashSecurityValue("org-2"), hashSecurityValue("same-user")],
          origin,
          now
        },
        dependencies
      )
    ).resolves.toBeUndefined();
  });

  it("fails closed when the configured store fails", async () => {
    const store: RateLimitStore = {
      increment: vi.fn(async () => {
        throw new Error("database unavailable");
      })
    };
    const dependencies = createDependencies(store);
    const subject = createLoginSecuritySubject("owner@example.com");

    const result = await checkRateLimit(
      {
        operation: rateLimitOperations.loginAttempt,
        keyParts: [subject.subjectHash],
        subjectHash: subject.subjectHash,
        origin
      },
      dependencies
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("store_failure");
    expect(dependencies.reportError).toHaveBeenCalledWith(
      "Rate limit store failed.",
      expect.objectContaining({
        operation: rateLimitOperations.loginAttempt,
        errorName: "Error"
      })
    );
  });
});
