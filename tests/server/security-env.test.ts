import { describe, expect, it } from "vitest";
import {
  getSecurityRuntimeConfig,
  SecurityConfigurationError
} from "@/server/security/security-env";

const productionEnv = {
  NODE_ENV: "production",
  FIXFLOW_APP_ENV: "production",
  FIXFLOW_RATE_LIMIT_STORE: "database",
  FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_WINDOW_SECONDS: "300",
  FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_WINDOW_SECONDS: "300",
  FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_WINDOW_SECONDS: "300",
  FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_WINDOW_SECONDS: "900",
  FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_WINDOW_SECONDS: "300",
  FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_LIMIT: "60",
  FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_WINDOW_SECONDS: "60",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_WINDOW_SECONDS: "300",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_WINDOW_SECONDS: "300",
  FIXFLOW_SECURITY_AUDIT_ENABLED: "true",
  FIXFLOW_SECURITY_AUDIT_STORE: "database",
  FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES: "30",
  FIXFLOW_SECURITY_RETENTION_EXPIRED_SESSION_DAYS: "7",
  FIXFLOW_SECURITY_RETENTION_CLOSED_INVITATION_DAYS: "30",
  FIXFLOW_SECURITY_RETENTION_CLOSED_PASSWORD_RESET_DAYS: "30",
  FIXFLOW_SECURITY_RETENTION_RATE_LIMIT_COUNTER_SECONDS: "86400",
  FIXFLOW_SECURITY_RETENTION_AUDIT_LOG_DAYS: "90",
  FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE: "500"
} satisfies NodeJS.ProcessEnv;

describe("security runtime config", () => {
  it("uses safe predictable development defaults", () => {
    const config = getSecurityRuntimeConfig({
      NODE_ENV: "development"
    });

    expect(config.appEnvironment).toBe("development");
    expect(config.rateLimit.store).toBe("memory");
    expect(config.audit).toEqual({
      enabled: true,
      store: "database"
    });
  });

  it("accepts explicit production-safe configuration", () => {
    const config = getSecurityRuntimeConfig(productionEnv);

    expect(config.appEnvironment).toBe("production");
    expect(config.rateLimit.store).toBe("database");
    expect(config.rateLimit.policies.LOGIN_ATTEMPT).toEqual({
      limit: 5,
      windowSeconds: 300
    });
    expect(config.rateLimit.policies.ACCOUNT_SETUP_ATTEMPT).toEqual({
      limit: 5,
      windowSeconds: 300
    });
    expect(config.passwordReset.tokenTtlMinutes).toBe(30);
    expect(config.retention.auditLogDays).toBe(90);
    expect(config.cleanup.batchSize).toBe(500);
  });

  it("rejects missing production rate limit store", () => {
    const { FIXFLOW_RATE_LIMIT_STORE, ...env } = productionEnv;

    expect(() => getSecurityRuntimeConfig(env)).toThrow(
      SecurityConfigurationError
    );
  });

  it("rejects memory rate limit store in production", () => {
    expect(() =>
      getSecurityRuntimeConfig({
        ...productionEnv,
        FIXFLOW_RATE_LIMIT_STORE: "memory"
      })
    ).toThrow(
      "FIXFLOW_RATE_LIMIT_STORE must be database in staging and production."
    );
  });

  it("rejects disabled audit in production", () => {
    expect(() =>
      getSecurityRuntimeConfig({
        ...productionEnv,
        FIXFLOW_SECURITY_AUDIT_ENABLED: "false"
      })
    ).toThrow(
      "FIXFLOW_SECURITY_AUDIT_ENABLED cannot be false in staging or production."
    );
  });

  it("treats staging as a deployed environment with persistent stores", () => {
    expect(
      getSecurityRuntimeConfig({
        ...productionEnv,
        FIXFLOW_APP_ENV: "staging"
      }).appEnvironment
    ).toBe("staging");

    expect(() =>
      getSecurityRuntimeConfig({
        ...productionEnv,
        FIXFLOW_APP_ENV: "staging",
        FIXFLOW_RATE_LIMIT_STORE: "memory"
      })
    ).toThrow(
      "FIXFLOW_RATE_LIMIT_STORE must be database in staging and production."
    );
  });

  it("rejects password reset and cleanup values outside safe bounds", () => {
    expect(() =>
      getSecurityRuntimeConfig({
        NODE_ENV: "development",
        FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES: "1"
      })
    ).toThrow(
      "FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 1440."
    );

    expect(() =>
      getSecurityRuntimeConfig({
        NODE_ENV: "development",
        FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE: "5001"
      })
    ).toThrow(
      "FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE must be between 1 and 5000."
    );
  });
});
