import {
  getSecurityRuntimeConfig,
  isDeployedEnvironment,
  type RuntimeEnvironment,
  type SecurityRuntimeConfig
} from "../security/security-env";

export const runtimeConfigKeys = {
  appBaseUrl: "FIXFLOW_APP_BASE_URL",
  releaseSha: "FIXFLOW_RELEASE_SHA",
  trustProxy: "FIXFLOW_TRUST_PROXY",
  serverActionAllowedOrigins: "FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS",
  readinessTimeoutMs: "FIXFLOW_READINESS_TIMEOUT_MS"
} as const;

export type RuntimeConfig = {
  environment: RuntimeEnvironment;
  databaseUrl: string;
  appBaseUrl: URL;
  releaseSha: string;
  trustProxy: boolean;
  serverActionAllowedOrigins: string[];
  readinessTimeoutMs: number;
  secureCookies: boolean;
  security: SecurityRuntimeConfig;
};

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

function readRequired(
  env: NodeJS.ProcessEnv,
  key: string,
  deployed: boolean
): string {
  const value = env[key]?.trim();

  if (value) {
    return value;
  }

  if (deployed) {
    throw new RuntimeConfigurationError(
      `${key} must be configured in staging and production.`
    );
  }

  return "";
}

function readBoolean(
  env: NodeJS.ProcessEnv,
  key: string,
  deployed: boolean
): boolean {
  const value = env[key]?.trim().toLowerCase();

  if (!value) {
    if (deployed) {
      throw new RuntimeConfigurationError(
        `${key} must be configured in staging and production.`
      );
    }

    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new RuntimeConfigurationError(`${key} must be true or false.`);
}

function readBaseUrl(
  rawValue: string,
  environment: RuntimeEnvironment
): URL {
  const fallback = "http://localhost:3000";
  let url: URL;

  try {
    url = new URL(rawValue || fallback);
  } catch {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.appBaseUrl} must be a valid absolute URL.`
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.appBaseUrl} must use HTTP or HTTPS.`
    );
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.appBaseUrl} must not contain credentials, query parameters or fragments.`
    );
  }

  if (url.pathname !== "/" && url.pathname.replace(/\/+$/, "") !== "") {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.appBaseUrl} must not contain a path.`
    );
  }

  if (environment === "production" && url.protocol !== "https:") {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.appBaseUrl} must use HTTPS in production.`
    );
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url;
}

function validateDatabaseUrl(
  rawValue: string,
  deployed: boolean
): string {
  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new RuntimeConfigurationError(
      "DATABASE_URL must be a valid PostgreSQL URL."
    );
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new RuntimeConfigurationError(
      "DATABASE_URL must be a PostgreSQL URL."
    );
  }

  if (!url.pathname || url.pathname === "/") {
    throw new RuntimeConfigurationError(
      "DATABASE_URL must identify a database."
    );
  }

  if (deployed && (!url.username || !url.password)) {
    throw new RuntimeConfigurationError(
      "DATABASE_URL must include runtime-managed credentials in staging and production."
    );
  }

  const unsafeCredentialParts = [
    "password",
    "changeme",
    "change_me",
    "fixflow_dev_password"
  ];
  const normalizedPassword = decodeURIComponent(url.password).toLowerCase();

  if (
    deployed &&
    unsafeCredentialParts.some((part) => normalizedPassword.includes(part))
  ) {
    throw new RuntimeConfigurationError(
      "DATABASE_URL contains a known development or placeholder credential."
    );
  }

  return rawValue;
}

function validateReleaseSha(value: string, deployed: boolean): string {
  if (
    deployed &&
    (!/^[A-Za-z0-9._-]{7,128}$/.test(value) ||
      ["unknown", "development", "latest"].includes(value.toLowerCase()) ||
      value.toLowerCase().includes("change_me"))
  ) {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.releaseSha} must identify the deployed release.`
    );
  }

  return value;
}

function assertNoBootstrapConfiguration(
  env: NodeJS.ProcessEnv,
  deployed: boolean
): void {
  if (!deployed) {
    return;
  }

  const forbiddenKeys = Object.keys(env).filter(
    (key) =>
      key.startsWith("FIXFLOW_BOOTSTRAP_") && Boolean(env[key]?.trim())
  );

  if (forbiddenKeys.length > 0) {
    throw new RuntimeConfigurationError(
      "FIXFLOW_BOOTSTRAP_* variables must not be configured in staging or production."
    );
  }

  if (env.FIXFLOW_DEMO_SEED_ENABLED?.trim().toLowerCase() === "true") {
    throw new RuntimeConfigurationError(
      "FIXFLOW_DEMO_SEED_ENABLED must not be true in staging or production runtime."
    );
  }

  const demoConfigurationKeys = Object.keys(env).filter(
    (key) =>
      key.startsWith("FIXFLOW_DEMO_") &&
      key !== "FIXFLOW_DEMO_SEED_ENABLED" &&
      Boolean(env[key]?.trim())
  );

  if (demoConfigurationKeys.length > 0) {
    throw new RuntimeConfigurationError(
      "FIXFLOW_DEMO_* configuration must not be present in staging or production runtime."
    );
  }
}

function readAllowedOrigins(
  rawValue: string,
  appBaseUrl: URL,
  deployed: boolean
): string[] {
  const rawOrigins = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = rawOrigins.length > 0
    ? rawOrigins
    : deployed
      ? []
      : [appBaseUrl.host];

  if (origins.length === 0) {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.serverActionAllowedOrigins} must be configured in staging and production.`
    );
  }

  for (const origin of origins) {
    if (
      origin.includes("://") ||
      origin.includes("/") ||
      origin.includes("*") ||
      /\s/.test(origin)
    ) {
      throw new RuntimeConfigurationError(
        `${runtimeConfigKeys.serverActionAllowedOrigins} must contain comma-separated host names without schemes, paths or wildcards.`
      );
    }
  }

  if (deployed && !origins.includes(appBaseUrl.host)) {
    throw new RuntimeConfigurationError(
      `${runtimeConfigKeys.serverActionAllowedOrigins} must include the application host.`
    );
  }

  return [...new Set(origins)];
}

function readReadinessTimeout(
  env: NodeJS.ProcessEnv,
  deployed: boolean
): number {
  const key = runtimeConfigKeys.readinessTimeoutMs;
  const rawValue = env[key]?.trim();

  if (!rawValue) {
    if (deployed) {
      throw new RuntimeConfigurationError(
        `${key} must be configured in staging and production.`
      );
    }

    return 2_000;
  }

  if (!/^[1-9]\d*$/.test(rawValue)) {
    throw new RuntimeConfigurationError(`${key} must be an integer.`);
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value < 250 || value > 10_000) {
    throw new RuntimeConfigurationError(
      `${key} must be between 250 and 10000.`
    );
  }

  return value;
}

export function getRuntimeConfig(env = process.env): RuntimeConfig {
  const security = getSecurityRuntimeConfig(env);
  const environment = security.appEnvironment;
  const deployed = isDeployedEnvironment(environment);
  assertNoBootstrapConfiguration(env, deployed);
  const databaseUrl = validateDatabaseUrl(
    readRequired(env, "DATABASE_URL", deployed) ||
      "postgresql://localhost/fixflow_development",
    deployed
  );
  const appBaseUrl = readBaseUrl(
    readRequired(env, runtimeConfigKeys.appBaseUrl, deployed),
    environment
  );
  const releaseSha = validateReleaseSha(
    readRequired(env, runtimeConfigKeys.releaseSha, deployed) || "development",
    deployed
  );
  const trustProxy = readBoolean(
    env,
    runtimeConfigKeys.trustProxy,
    deployed
  );
  const serverActionAllowedOrigins = readAllowedOrigins(
    readRequired(
      env,
      runtimeConfigKeys.serverActionAllowedOrigins,
      deployed
    ),
    appBaseUrl,
    deployed
  );

  return {
    environment,
    databaseUrl,
    appBaseUrl,
    releaseSha,
    trustProxy,
    serverActionAllowedOrigins,
    readinessTimeoutMs: readReadinessTimeout(env, deployed),
    secureCookies: deployed,
    security
  };
}

export function getPublicReleaseIdentity(
  config: Pick<RuntimeConfig, "releaseSha">
): { version: string; release: string } {
  return {
    version: process.env.npm_package_version ?? "0.1.0",
    release: config.releaseSha
  };
}

export function getRuntimeReleaseIdentity(
  env = process.env
): { version: string; release: string } {
  return {
    version: env.npm_package_version?.trim() || "0.1.0",
    release: env.FIXFLOW_RELEASE_SHA?.trim() || "development"
  };
}
