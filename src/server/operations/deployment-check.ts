import type { RuntimeConfig } from "../runtime/runtime-config";
import { getRuntimeConfig } from "../runtime/runtime-config";

export const requiredRuntimeTables = [
  "Organization",
  "User",
  "AuthSession",
  "RateLimitCounter",
  "SecurityAuditLog"
] as const;

export type DatabaseDeploymentState = {
  tables: string[];
  appliedMigrations: string[];
};

export type DeploymentCheckDependencies = {
  getConfig(env: NodeJS.ProcessEnv): RuntimeConfig;
  validatePrismaSchema(): Promise<void>;
  listMigrationNames(): Promise<string[]>;
  inspectDatabase(): Promise<DatabaseDeploymentState>;
};

export type DeploymentCheckResult = {
  environment: RuntimeConfig["environment"];
  release: string;
  migrationCount: number;
  checks: string[];
};

export class DeploymentCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentCheckError";
  }
}

export async function runDeploymentCheck(
  env: NodeJS.ProcessEnv,
  dependencies: DeploymentCheckDependencies
): Promise<DeploymentCheckResult> {
  const config = dependencies.getConfig(env);
  await dependencies.validatePrismaSchema();
  const [migrationNames, databaseState] = await Promise.all([
    dependencies.listMigrationNames(),
    dependencies.inspectDatabase()
  ]);

  if (migrationNames.length === 0) {
    throw new DeploymentCheckError("No versioned Prisma migrations were found.");
  }

  const missingTables = requiredRuntimeTables.filter(
    (table) => !databaseState.tables.includes(table)
  );

  if (missingTables.length > 0) {
    throw new DeploymentCheckError(
      "The database is missing required application tables."
    );
  }

  const missingMigrations = migrationNames.filter(
    (migration) => !databaseState.appliedMigrations.includes(migration)
  );

  if (missingMigrations.length > 0) {
    throw new DeploymentCheckError(
      "The database has pending versioned migrations."
    );
  }

  return {
    environment: config.environment,
    release: config.releaseSha,
    migrationCount: migrationNames.length,
    checks: [
      "runtime_configuration",
      "prisma_schema",
      "versioned_migrations",
      "database_connectivity",
      "persistent_security_stores"
    ]
  };
}

export function getDefaultDeploymentConfig(
  env: NodeJS.ProcessEnv
): RuntimeConfig {
  return getRuntimeConfig(env);
}
