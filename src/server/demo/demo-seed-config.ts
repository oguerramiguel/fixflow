import {
  runtimeEnvironments,
  type RuntimeEnvironment
} from "../security/security-env";

export type DemoSeedConfig = {
  environment: Exclude<RuntimeEnvironment, "production">;
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  technicianName: string;
  technicianEmail: string;
  technicianPassword: string;
};

export class DemoSeedConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoSeedConfigurationError";
  }
}

function readRequired(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new DemoSeedConfigurationError(`${key} must be configured.`);
  }

  return value;
}

function readEnvironment(env: NodeJS.ProcessEnv): RuntimeEnvironment {
  const value = env.FIXFLOW_APP_ENV?.trim() ?? "";

  if (!runtimeEnvironments.includes(value as RuntimeEnvironment)) {
    throw new DemoSeedConfigurationError(
      "FIXFLOW_APP_ENV must be explicitly configured for the demo seed."
    );
  }

  return value as RuntimeEnvironment;
}

function assertSafeDemoPassword(
  password: string,
  key: string,
  environment: RuntimeEnvironment
): void {
  const normalized = password.toLowerCase();
  const knownUnsafeParts = [
    "changeme",
    "change_me",
    "password",
    "fixflow_dev",
    "123456"
  ];

  if (
    environment === "staging" &&
    (password.length < 16 ||
      knownUnsafeParts.some((part) => normalized.includes(part)))
  ) {
    throw new DemoSeedConfigurationError(
      `${key} must be a unique strong staging credential.`
    );
  }
}

export function getDemoSeedConfig(env = process.env): DemoSeedConfig {
  const environment = readEnvironment(env);

  if (environment === "production") {
    throw new DemoSeedConfigurationError(
      "Demo seed is forbidden in production."
    );
  }

  if (env.FIXFLOW_DEMO_SEED_ENABLED?.trim().toLowerCase() !== "true") {
    throw new DemoSeedConfigurationError(
      "FIXFLOW_DEMO_SEED_ENABLED must be explicitly set to true."
    );
  }

  const ownerPassword = readRequired(
    env,
    "FIXFLOW_DEMO_OWNER_PASSWORD"
  );
  const technicianPassword = readRequired(
    env,
    "FIXFLOW_DEMO_TECHNICIAN_PASSWORD"
  );
  assertSafeDemoPassword(
    ownerPassword,
    "FIXFLOW_DEMO_OWNER_PASSWORD",
    environment
  );
  assertSafeDemoPassword(
    technicianPassword,
    "FIXFLOW_DEMO_TECHNICIAN_PASSWORD",
    environment
  );
  const ownerEmail = readRequired(
    env,
    "FIXFLOW_DEMO_OWNER_EMAIL"
  ).toLowerCase();
  const technicianEmail = readRequired(
    env,
    "FIXFLOW_DEMO_TECHNICIAN_EMAIL"
  ).toLowerCase();
  const organizationSlug = readRequired(
    env,
    "FIXFLOW_DEMO_ORGANIZATION_SLUG"
  ).toLowerCase();

  if (ownerEmail === technicianEmail) {
    throw new DemoSeedConfigurationError(
      "Demo OWNER and TECHNICIAN emails must be different."
    );
  }

  if (
    !ownerEmail.endsWith(".invalid") ||
    !technicianEmail.endsWith(".invalid")
  ) {
    throw new DemoSeedConfigurationError(
      "Demo identities must use reserved .invalid email addresses."
    );
  }

  if (!organizationSlug.includes("demo")) {
    throw new DemoSeedConfigurationError(
      "FIXFLOW_DEMO_ORGANIZATION_SLUG must identify a demo Organization."
    );
  }

  return {
    environment,
    organizationName: readRequired(
      env,
      "FIXFLOW_DEMO_ORGANIZATION_NAME"
    ),
    organizationSlug,
    ownerName: readRequired(env, "FIXFLOW_DEMO_OWNER_NAME"),
    ownerEmail,
    ownerPassword,
    technicianName: readRequired(
      env,
      "FIXFLOW_DEMO_TECHNICIAN_NAME"
    ),
    technicianEmail,
    technicianPassword
  };
}
