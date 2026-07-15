import {
  rateLimitOperations,
  type RateLimitOperation,
  type RateLimitPolicy
} from "@/server/security/rate-limit-types";

export const runtimeEnvironments = [
  "development",
  "test",
  "production"
] as const;

export type RuntimeEnvironment = (typeof runtimeEnvironments)[number];
export type RateLimitStoreKind = "memory" | "database";
export type SecurityAuditStoreKind = "database";

export type SecurityRuntimeConfig = {
  appEnvironment: RuntimeEnvironment;
  rateLimit: {
    store: RateLimitStoreKind;
    policies: Record<RateLimitOperation, RateLimitPolicy>;
  };
  audit: {
    enabled: boolean;
    store: SecurityAuditStoreKind;
  };
};

export class SecurityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityConfigurationError";
  }
}

const defaultRateLimitPolicies: Record<RateLimitOperation, RateLimitPolicy> = {
  [rateLimitOperations.loginAttempt]: {
    limit: 5,
    windowSeconds: 300
  },
  [rateLimitOperations.publicPortalLookup]: {
    limit: 60,
    windowSeconds: 60
  },
  [rateLimitOperations.publicQuoteApprove]: {
    limit: 5,
    windowSeconds: 300
  },
  [rateLimitOperations.publicQuoteReject]: {
    limit: 5,
    windowSeconds: 300
  }
};

const rateLimitPolicyEnvKeys = {
  [rateLimitOperations.loginAttempt]: {
    limit: "FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_WINDOW_SECONDS"
  },
  [rateLimitOperations.publicPortalLookup]: {
    limit: "FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_WINDOW_SECONDS"
  },
  [rateLimitOperations.publicQuoteApprove]: {
    limit: "FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_WINDOW_SECONDS"
  },
  [rateLimitOperations.publicQuoteReject]: {
    limit: "FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_WINDOW_SECONDS"
  }
} as const satisfies Record<
  RateLimitOperation,
  { limit: string; windowSeconds: string }
>;

function isRuntimeEnvironment(value: string): value is RuntimeEnvironment {
  return runtimeEnvironments.includes(value as RuntimeEnvironment);
}

function readRuntimeEnvironment(
  env: NodeJS.ProcessEnv
): RuntimeEnvironment {
  const rawEnvironment = env.FIXFLOW_APP_ENV ?? env.NODE_ENV ?? "development";

  if (!isRuntimeEnvironment(rawEnvironment)) {
    throw new SecurityConfigurationError(
      "FIXFLOW_APP_ENV must be development, test or production."
    );
  }

  if (env.NODE_ENV === "production" && rawEnvironment !== "production") {
    throw new SecurityConfigurationError(
      "FIXFLOW_APP_ENV must be production when NODE_ENV is production."
    );
  }

  return rawEnvironment;
}

function readPositiveInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: number,
  appEnvironment: RuntimeEnvironment
): number {
  const rawValue = env[key]?.trim();

  if (!rawValue) {
    if (appEnvironment === "production") {
      throw new SecurityConfigurationError(
        `${key} must be configured in production.`
      );
    }

    return defaultValue;
  }

  if (!/^[1-9]\d*$/.test(rawValue)) {
    throw new SecurityConfigurationError(`${key} must be a positive integer.`);
  }

  return Number(rawValue);
}

function readBoolean(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: boolean,
  appEnvironment: RuntimeEnvironment
): boolean {
  const rawValue = env[key]?.trim().toLowerCase();

  if (!rawValue) {
    if (appEnvironment === "production") {
      throw new SecurityConfigurationError(
        `${key} must be configured in production.`
      );
    }

    return defaultValue;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new SecurityConfigurationError(`${key} must be true or false.`);
}

function readRateLimitStore(
  env: NodeJS.ProcessEnv,
  appEnvironment: RuntimeEnvironment
): RateLimitStoreKind {
  const rawStore = env.FIXFLOW_RATE_LIMIT_STORE?.trim();

  if (!rawStore) {
    if (appEnvironment === "production") {
      throw new SecurityConfigurationError(
        "FIXFLOW_RATE_LIMIT_STORE must be configured in production."
      );
    }

    return "memory";
  }

  if (rawStore !== "memory" && rawStore !== "database") {
    throw new SecurityConfigurationError(
      "FIXFLOW_RATE_LIMIT_STORE must be memory or database."
    );
  }

  if (appEnvironment === "production" && rawStore !== "database") {
    throw new SecurityConfigurationError(
      "FIXFLOW_RATE_LIMIT_STORE must be database in production."
    );
  }

  return rawStore;
}

function readSecurityAuditStore(
  env: NodeJS.ProcessEnv,
  appEnvironment: RuntimeEnvironment
): SecurityAuditStoreKind {
  const rawStore = env.FIXFLOW_SECURITY_AUDIT_STORE?.trim();

  if (!rawStore) {
    if (appEnvironment === "production") {
      throw new SecurityConfigurationError(
        "FIXFLOW_SECURITY_AUDIT_STORE must be configured in production."
      );
    }

    return "database";
  }

  if (rawStore !== "database") {
    throw new SecurityConfigurationError(
      "FIXFLOW_SECURITY_AUDIT_STORE must be database."
    );
  }

  return rawStore;
}

function readRateLimitPolicies(
  env: NodeJS.ProcessEnv,
  appEnvironment: RuntimeEnvironment
): Record<RateLimitOperation, RateLimitPolicy> {
  return Object.fromEntries(
    Object.entries(rateLimitPolicyEnvKeys).map(([operation, keys]) => {
      const defaultPolicy = defaultRateLimitPolicies[operation as RateLimitOperation];

      return [
        operation,
        {
          limit: readPositiveInteger(
            env,
            keys.limit,
            defaultPolicy.limit,
            appEnvironment
          ),
          windowSeconds: readPositiveInteger(
            env,
            keys.windowSeconds,
            defaultPolicy.windowSeconds,
            appEnvironment
          )
        }
      ];
    })
  ) as Record<RateLimitOperation, RateLimitPolicy>;
}

export function getSecurityRuntimeConfig(
  env = process.env
): SecurityRuntimeConfig {
  const appEnvironment = readRuntimeEnvironment(env);
  const auditEnabled = readBoolean(
    env,
    "FIXFLOW_SECURITY_AUDIT_ENABLED",
    true,
    appEnvironment
  );

  if (appEnvironment === "production" && !auditEnabled) {
    throw new SecurityConfigurationError(
      "FIXFLOW_SECURITY_AUDIT_ENABLED cannot be false in production."
    );
  }

  return {
    appEnvironment,
    rateLimit: {
      store: readRateLimitStore(env, appEnvironment),
      policies: readRateLimitPolicies(env, appEnvironment)
    },
    audit: {
      enabled: auditEnabled,
      store: readSecurityAuditStore(env, appEnvironment)
    }
  };
}
