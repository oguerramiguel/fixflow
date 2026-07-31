import { describe, expect, it } from "vitest";
import {
  DemoSeedConfigurationError,
  getDemoSeedConfig
} from "@/server/demo/demo-seed-config";

const safeEnv = {
  NODE_ENV: "production",
  FIXFLOW_APP_ENV: "staging",
  FIXFLOW_DEMO_SEED_ENABLED: "true",
  FIXFLOW_DEMO_ORGANIZATION_NAME: "FixFlow Demo",
  FIXFLOW_DEMO_ORGANIZATION_SLUG: "fixflow-demo",
  FIXFLOW_DEMO_OWNER_NAME: "Demo Owner",
  FIXFLOW_DEMO_OWNER_EMAIL: "OWNER@demo.invalid",
  FIXFLOW_DEMO_OWNER_PASSWORD: "UniqueOwnerCredential!2026",
  FIXFLOW_DEMO_TECHNICIAN_NAME: "Demo Technician",
  FIXFLOW_DEMO_TECHNICIAN_EMAIL: "TECH@demo.invalid",
  FIXFLOW_DEMO_TECHNICIAN_PASSWORD: "UniqueTechCredential!2026"
} satisfies NodeJS.ProcessEnv;

describe("demo seed configuration", () => {
  it("requires an explicit enable flag and configurable identities", () => {
    const config = getDemoSeedConfig(safeEnv);

    expect(config.environment).toBe("staging");
    expect(config.ownerEmail).toBe("owner@demo.invalid");
    expect(config.technicianEmail).toBe("tech@demo.invalid");
  });

  it("is always forbidden in production", () => {
    expect(() =>
      getDemoSeedConfig({
        ...safeEnv,
        FIXFLOW_APP_ENV: "production"
      })
    ).toThrow("Demo seed is forbidden in production.");
  });

  it("rejects disabled and placeholder staging credentials", () => {
    expect(() =>
      getDemoSeedConfig({
        ...safeEnv,
        FIXFLOW_DEMO_SEED_ENABLED: "false"
      })
    ).toThrow(DemoSeedConfigurationError);

    expect(() =>
      getDemoSeedConfig({
        ...safeEnv,
        FIXFLOW_DEMO_OWNER_PASSWORD: "ChangeMePassword123!"
      })
    ).toThrow("must be a unique strong staging credential");
  });

  it("requires unmistakably fake identities and an explicit demo slug", () => {
    expect(() =>
      getDemoSeedConfig({
        ...safeEnv,
        FIXFLOW_DEMO_OWNER_EMAIL: "owner@example.com"
      })
    ).toThrow("must use reserved .invalid email addresses");

    expect(() =>
      getDemoSeedConfig({
        ...safeEnv,
        FIXFLOW_DEMO_ORGANIZATION_SLUG: "fixflow"
      })
    ).toThrow("must identify a demo Organization");
  });
});
