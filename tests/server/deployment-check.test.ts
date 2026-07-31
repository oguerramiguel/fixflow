import { describe, expect, it, vi } from "vitest";
import {
  DeploymentCheckError,
  requiredRuntimeTables,
  runDeploymentCheck,
  type DeploymentCheckDependencies
} from "@/server/operations/deployment-check";
import type { RuntimeConfig } from "@/server/runtime/runtime-config";

const runtimeConfig = {
  environment: "staging",
  releaseSha: "abcdef123456"
} as RuntimeConfig;

function createDependencies(
  overrides: Partial<DeploymentCheckDependencies> = {}
): DeploymentCheckDependencies {
  return {
    getConfig: vi.fn(() => runtimeConfig),
    validatePrismaSchema: vi.fn(async () => undefined),
    listMigrationNames: vi.fn(async () => ["20260709000000_init"]),
    inspectDatabase: vi.fn(async () => ({
      tables: [...requiredRuntimeTables],
      appliedMigrations: ["20260709000000_init"]
    })),
    ...overrides
  };
}

describe("deployment check", () => {
  it("validates runtime, schema, migrations, database and persistent stores without writes", async () => {
    const dependencies = createDependencies();

    await expect(
      runDeploymentCheck({ NODE_ENV: "test" }, dependencies)
    ).resolves.toMatchObject({
      environment: "staging",
      release: "abcdef123456",
      migrationCount: 1,
      checks: expect.arrayContaining([
        "runtime_configuration",
        "prisma_schema",
        "database_connectivity",
        "persistent_security_stores"
      ])
    });
    expect(dependencies.validatePrismaSchema).toHaveBeenCalledOnce();
    expect(dependencies.inspectDatabase).toHaveBeenCalledOnce();
  });

  it("fails when migrations are pending or required stores are absent", async () => {
    await expect(
      runDeploymentCheck(
        { NODE_ENV: "test" },
        createDependencies({
          inspectDatabase: vi.fn(async () => ({
            tables: [...requiredRuntimeTables],
            appliedMigrations: []
          }))
        })
      )
    ).rejects.toThrow("pending versioned migrations");

    await expect(
      runDeploymentCheck(
        { NODE_ENV: "test" },
        createDependencies({
          inspectDatabase: vi.fn(async () => ({
            tables: [],
            appliedMigrations: ["20260709000000_init"]
          }))
        })
      )
    ).rejects.toBeInstanceOf(DeploymentCheckError);
  });
});
