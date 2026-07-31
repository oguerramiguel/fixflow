import {
  rateLimitOperations,
  type RateLimitOperation,
  type RateLimitPolicy
} from "./rate-limit-types";

export const runtimeEnvironments = [
  "development",
  "test",
  "staging",
  "production"
] as const;

export type RuntimeEnvironment = (typeof runtimeEnvironments)[number];
export type RateLimitStoreKind = "memory" | "database";
export type SecurityAuditStoreKind = "database";

export type SecurityRuntimeConfig = {
  appEnvironment: RuntimeEnvironment;
  passwordReset: {
    tokenTtlMinutes: number;
  };
  rateLimit: {
    store: RateLimitStoreKind;
    policies: Record<RateLimitOperation, RateLimitPolicy>;
  };
  audit: {
    enabled: boolean;
    store: SecurityAuditStoreKind;
  };
  retention: {
    expiredSessionDays: number;
    closedInvitationDays: number;
    closedPasswordResetDays: number;
    rateLimitCounterSeconds: number;
    auditLogDays: number;
  };
  cleanup: {
    batchSize: number;
  };
};

export class SecurityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityConfigurationError";
  }
}

export function isDeployedEnvironment(
  environment: RuntimeEnvironment
): boolean {
  return environment === "staging" || environment === "production";
}

const defaultRateLimitPolicies: Record<RateLimitOperation, RateLimitPolicy> = {
  [rateLimitOperations.loginAttempt]: {
    limit: 5,
    windowSeconds: 300
  },
  [rateLimitOperations.accountSetupAttempt]: {
    limit: 5,
    windowSeconds: 300
  },
  [rateLimitOperations.passwordChangeAttempt]: {
    limit: 5,
    windowSeconds: 300
  },
  [rateLimitOperations.passwordResetCreate]: {
    limit: 5,
    windowSeconds: 900
  },
  [rateLimitOperations.passwordResetConsume]: {
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
  [rateLimitOperations.accountSetupAttempt]: {
    limit: "FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_WINDOW_SECONDS"
  },
  [rateLimitOperations.passwordChangeAttempt]: {
    limit: "FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_WINDOW_SECONDS"
  },
  [rateLimitOperations.passwordResetCreate]: {
    limit: "FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_WINDOW_SECONDS"
  },
  [rateLimitOperations.passwordResetConsume]: {
    limit: "FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_LIMIT",
    windowSeconds: "FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_WINDOW_SECONDS"
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
      "FIXFLOW_APP_ENV must be development, test, staging or production."
    );
  }

  if (
    env.NODE_ENV === "production" &&
    rawEnvironment !== "staging" &&
    rawEnvironment !== "production"
  ) {
    throw new SecurityConfigurationError(
      "FIXFLOW_APP_ENV must be staging or production when NODE_ENV is production."
    );
  }

  return rawEnvironment;
}

function readBoundedInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: number,
  appEnvironment: RuntimeEnvironment,
  limits: {
    min: number;
    max: number;
  }
): number {
  const rawValue = env[key]?.trim();

  if (!rawValue) {
    if (isDeployedEnvironment(appEnvironment)) {
      throw new SecurityConfigurationError(
        `${key} must be configured in staging and production.`
      );
    }

    return defaultValue;
  }

  if (!/^(?:0|[1-9]\d*)$/.test(rawValue)) {
    throw new SecurityConfigurationError(`${key} must be an integer.`);
  }

  const value = Number(rawValue);

  if (
    !Number.isSafeInteger(value) ||
    value < limits.min ||
    value > limits.max
  ) {
    throw new SecurityConfigurationError(
      `${key} must be between ${limits.min} and ${limits.max}.`
    );
  }

  return value;
}

function readBoolean(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: boolean,
  appEnvironment: RuntimeEnvironment
): boolean {
  const rawValue = env[key]?.trim().toLowerCase();

  if (!rawValue) {
    if (isDeployedEnvironment(appEnvironment)) {
      throw new SecurityConfigurationError(
        `${key} must be configured in staging and production.`
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
    if (isDeployedEnvironment(appEnvironment)) {
      throw new SecurityConfigurationError(
        "FIXFLOW_RATE_LIMIT_STORE must be configured in staging and production."
      );
    }

    return "memory";
  }

  if (rawStore !== "memory" && rawStore !== "database") {
    throw new SecurityConfigurationError(
      "FIXFLOW_RATE_LIMIT_STORE must be memory or database."
    );
  }

  if (isDeployedEnvironment(appEnvironment) && rawStore !== "database") {
    throw new SecurityConfigurationError(
      "FIXFLOW_RATE_LIMIT_STORE must be database in staging and production."
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
    if (isDeployedEnvironment(appEnvironment)) {
      throw new SecurityConfigurationError(
        "FIXFLOW_SECURITY_AUDIT_STORE must be configured in staging and production."
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
          limit: readBoundedInteger(
            env,
            keys.limit,
            defaultPolicy.limit,
            appEnvironment,
            {
              min: 1,
              max: 10000
            }
          ),
          windowSeconds: readBoundedInteger(
            env,
            keys.windowSeconds,
            defaultPolicy.windowSeconds,
            appEnvironment,
            {
              min: 1,
              max: 604800
            }
          )
        }
      ];
    })
  ) as Record<RateLimitOperation, RateLimitPolicy>;
}

function readPasswordResetConfig(
  env: NodeJS.ProcessEnv,
  appEnvironment: RuntimeEnvironment
): SecurityRuntimeConfig["passwordReset"] {
  return {
    tokenTtlMinutes: readBoundedInteger(
      env,
      "FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES",
      30,
      appEnvironment,
      {
        min: 5,
        max: 1440
      }
    )
  };
}

function readRetentionConfig(
  env: NodeJS.ProcessEnv,
  appEnvironment: RuntimeEnvironment
): SecurityRuntimeConfig["retention"] {
  return {
    expiredSessionDays: readBoundedInteger(
      env,
      "FIXFLOW_SECURITY_RETENTION_EXPIRED_SESSION_DAYS",
      7,
      appEnvironment,
      {
        min: 1,
        max: 365
      }
    ),
    closedInvitationDays: readBoundedInteger(
      env,
      "FIXFLOW_SECURITY_RETENTION_CLOSED_INVITATION_DAYS",
      30,
      appEnvironment,
      {
        min: 1,
        max: 3650
      }
    ),
    closedPasswordResetDays: readBoundedInteger(
      env,
      "FIXFLOW_SECURITY_RETENTION_CLOSED_PASSWORD_RESET_DAYS",
      30,
      appEnvironment,
      {
        min: 1,
        max: 3650
      }
    ),
    rateLimitCounterSeconds: readBoundedInteger(
      env,
      "FIXFLOW_SECURITY_RETENTION_RATE_LIMIT_COUNTER_SECONDS",
      86400,
      appEnvironment,
      {
        min: 0,
        max: 604800
      }
    ),
    auditLogDays: readBoundedInteger(
      env,
      "FIXFLOW_SECURITY_RETENTION_AUDIT_LOG_DAYS",
      90,
      appEnvironment,
      {
        min: 1,
        max: 3650
      }
    )
  };
}

function readCleanupConfig(
  env: NodeJS.ProcessEnv,
  appEnvironment: RuntimeEnvironment
): SecurityRuntimeConfig["cleanup"] {
  return {
    batchSize: readBoundedInteger(
      env,
      "FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE",
      500,
      appEnvironment,
      {
        min: 1,
        max: 5000
      }
    )
  };
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

  if (isDeployedEnvironment(appEnvironment) && !auditEnabled) {
    throw new SecurityConfigurationError(
      "FIXFLOW_SECURITY_AUDIT_ENABLED cannot be false in staging or production."
    );
  }

  return {
    appEnvironment,
    passwordReset: readPasswordResetConfig(env, appEnvironment),
    rateLimit: {
      store: readRateLimitStore(env, appEnvironment),
      policies: readRateLimitPolicies(env, appEnvironment)
    },
    audit: {
      enabled: auditEnabled,
      store: readSecurityAuditStore(env, appEnvironment)
    },
    retention: readRetentionConfig(env, appEnvironment),
    cleanup: readCleanupConfig(env, appEnvironment)
  };
}
