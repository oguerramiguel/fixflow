import { execFile } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { promisify } from "node:util";
import { prisma } from "../src/server/db/prisma";
import {
  getDefaultDeploymentConfig,
  runDeploymentCheck,
  type DatabaseDeploymentState
} from "../src/server/operations/deployment-check";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

async function validatePrismaSchema(): Promise<void> {
  const prismaCli = require.resolve("prisma/build/index.js");

  await execFileAsync(process.execPath, [prismaCli, "validate"], {
    cwd: process.cwd(),
    env: process.env,
    timeout: 60_000,
    windowsHide: true
  });
}

async function listMigrationNames(): Promise<string[]> {
  const entries = await readdir("prisma/migrations", {
    withFileTypes: true
  });

  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  await Promise.all(
    migrationNames.map((migrationName) =>
      access(join("prisma", "migrations", migrationName, "migration.sql"))
    )
  );

  return migrationNames;
}

async function inspectDatabase(): Promise<DatabaseDeploymentState> {
  const tables = await prisma.$queryRaw<Array<{ tableName: string }>>`
    SELECT "table_name" AS "tableName"
    FROM "information_schema"."tables"
    WHERE "table_schema" = 'public';
  `;
  const migrations = await prisma.$queryRaw<Array<{ migrationName: string }>>`
    SELECT "migration_name" AS "migrationName"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL;
  `;

  return {
    tables: tables.map((row) => row.tableName),
    appliedMigrations: migrations.map((row) => row.migrationName)
  };
}

async function main(): Promise<void> {
  const result = await runDeploymentCheck(process.env, {
    getConfig: getDefaultDeploymentConfig,
    validatePrismaSchema,
    listMigrationNames,
    inspectDatabase
  });

  console.log(
    JSON.stringify(
      {
        operation: "deploy_check",
        status: "ok",
        environment: result.environment,
        release: result.release,
        migrationCount: result.migrationCount,
        checks: result.checks
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const safeMessage =
      error instanceof Error &&
      (errorName.endsWith("ConfigurationError") ||
        errorName === "DeploymentCheckError")
        ? error.message
        : "A deployment dependency check failed.";

    console.error("Deployment check failed.", {
      errorName,
      message: safeMessage
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
