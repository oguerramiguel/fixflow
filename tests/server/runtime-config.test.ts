import { describe, expect, it } from "vitest";
import {
  getRuntimeConfig,
  RuntimeConfigurationError
} from "@/server/runtime/runtime-config";

const deployedEnv = {
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://fixflow:unique-runtime-credential@postgres:5432/fixflow?schema=public",
  FIXFLOW_APP_ENV: "staging",
  FIXFLOW_APP_BASE_URL: "http://localhost:3100",
  FIXFLOW_RELEASE_SHA: "abcdef123456",
  FIXFLOW_TRUST_PROXY: "false",
  FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS: "localhost:3100",
  FIXFLOW_READINESS_TIMEOUT_MS: "2000",
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

describe("runtime configuration", () => {
  it("accepts complete staging configuration and enables secure cookies", () => {
    const config = getRuntimeConfig(deployedEnv);

    expect(config.environment).toBe("staging");
    expect(config.secureCookies).toBe(true);
    expect(config.trustProxy).toBe(false);
    expect(config.serverActionAllowedOrigins).toEqual(["localhost:3100"]);
    expect(config.releaseSha).toBe("abcdef123456");
  });

  it("requires HTTPS and a release identity in production", () => {
    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        FIXFLOW_APP_ENV: "production",
        FIXFLOW_APP_BASE_URL: "http://fixflow.example"
      })
    ).toThrow("FIXFLOW_APP_BASE_URL must use HTTPS in production.");

    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        FIXFLOW_APP_ENV: "production",
        FIXFLOW_APP_BASE_URL: "https://fixflow.example",
        FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS: "fixflow.example",
        FIXFLOW_RELEASE_SHA: "unknown"
      })
    ).toThrow(
      "FIXFLOW_RELEASE_SHA must identify the deployed release."
    );
  });

  it("rejects an application base URL with a path", () => {
    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        FIXFLOW_APP_BASE_URL: "http://localhost:3100/fixflow"
      })
    ).toThrow("FIXFLOW_APP_BASE_URL must not contain a path.");
  });

  it("rejects proxy wildcards, placeholder database credentials and bootstrap state", () => {
    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS: "*.example.com"
      })
    ).toThrow(RuntimeConfigurationError);

    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        DATABASE_URL:
          "postgresql://fixflow:password@postgres:5432/fixflow?schema=public"
      })
    ).toThrow("DATABASE_URL contains a known development or placeholder credential.");

    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        FIXFLOW_BOOTSTRAP_USER_PASSWORD: "not-allowed"
      })
    ).toThrow(
      "FIXFLOW_BOOTSTRAP_* variables must not be configured in staging or production."
    );

    expect(() =>
      getRuntimeConfig({
        ...deployedEnv,
        FIXFLOW_DEMO_OWNER_EMAIL: "owner@demo.invalid"
      })
    ).toThrow(
      "FIXFLOW_DEMO_* configuration must not be present in staging or production runtime."
    );
  });

  it("keeps development defaults explicit and non-secret", () => {
    const config = getRuntimeConfig({
      NODE_ENV: "development"
    });

    expect(config.environment).toBe("development");
    expect(config.appBaseUrl.href).toBe("http://localhost:3000/");
    expect(config.releaseSha).toBe("development");
    expect(config.secureCookies).toBe(false);
  });
});
