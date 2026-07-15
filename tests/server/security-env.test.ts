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
  FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_LIMIT: "60",
  FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_WINDOW_SECONDS: "60",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_WINDOW_SECONDS: "300",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_LIMIT: "5",
  FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_WINDOW_SECONDS: "300",
  FIXFLOW_SECURITY_AUDIT_ENABLED: "true",
  FIXFLOW_SECURITY_AUDIT_STORE: "database"
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
    ).toThrow("FIXFLOW_RATE_LIMIT_STORE must be database in production.");
  });

  it("rejects disabled audit in production", () => {
    expect(() =>
      getSecurityRuntimeConfig({
        ...productionEnv,
        FIXFLOW_SECURITY_AUDIT_ENABLED: "false"
      })
    ).toThrow("FIXFLOW_SECURITY_AUDIT_ENABLED cannot be false in production.");
  });
});
