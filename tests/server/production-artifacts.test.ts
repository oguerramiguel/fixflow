import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production readiness artifacts", () => {
  it("uses a locked multi-stage non-root standalone runtime", async () => {
    const dockerfile = await readFile("Dockerfile", "utf8");

    expect(dockerfile).toContain("FROM node:22.14.0-alpine3.21");
    expect(dockerfile).toContain("npm ci");
    expect(dockerfile).toContain("prisma/build/index.js generate");
    expect(dockerfile).toContain("FROM base AS migration");
    expect(dockerfile).toContain("FROM base AS runner");
    expect(dockerfile).toContain("USER nextjs");
    expect(dockerfile).toContain("/app/.next/standalone");
    expect(dockerfile).not.toContain("COPY .env");
  });

  it("keeps staging PostgreSQL internal and gates web on migrations", async () => {
    const compose = await readFile("docker-compose.staging.yml", "utf8");

    expect(compose).toContain("condition: service_completed_successfully");
    expect(compose).toContain("internal: true");
    expect(compose).toContain("target: migration");
    expect(compose).toContain("target: runner");
    const postgresService = compose.split("\n  migration:")[0];
    expect(postgresService).not.toContain("\n    ports:");
    expect(compose).not.toContain("db push");
    expect(compose).not.toContain("migrate reset");
    expect(compose).not.toContain("db:seed");
  });

  it("defines a manual Render staging release with one pre-deploy migration", async () => {
    const blueprint = await readFile("render.yaml", "utf8");
    const dockerfile = await readFile("Dockerfile", "utf8");

    expect(blueprint).toContain("runtime: docker");
    expect(blueprint).toContain("autoDeployTrigger: off");
    expect(blueprint).toContain(
      "preDeployCommand: npm run prisma:migrate:deploy && FIXFLOW_RELEASE_SHA=$RENDER_GIT_COMMIT npm run deploy:check"
    );
    expect(blueprint).toContain("healthCheckPath: /api/health/ready");
    expect(blueprint).toContain("property: connectionString");
    expect(blueprint).toContain("FIXFLOW_RATE_LIMIT_STORE");
    expect(blueprint).toContain("FIXFLOW_SECURITY_AUDIT_STORE");
    expect(blueprint).toContain("ipAllowList: []");
    expect(blueprint).not.toContain("db:seed");
    expect(blueprint).not.toContain("migrate dev");
    expect(blueprint).not.toContain("db push");
    expect(dockerfile).toContain("FROM runner AS render");
    expect(dockerfile).toContain('CMD ["node", "scripts/render-start.mjs"]');
  });

  it("excludes secrets, backups and development artifacts from Docker", async () => {
    const dockerignore = await readFile(".dockerignore", "utf8");

    expect(dockerignore).toContain(".env.*");
    expect(dockerignore).toContain(".git");
    expect(dockerignore).toContain("tests");
    expect(dockerignore).toContain("*.dump");
    expect(dockerignore).toContain("node_modules");
  });

  it("defines a quality-only CI workflow with an isolated PostgreSQL database", async () => {
    const workflow = await readFile(".github/workflows/quality.yml", "utf8");

    expect(workflow).toContain("permissions:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run test:postgres");
    expect(workflow).toContain("npm run prisma:migrate:deploy");
    expect(workflow).not.toContain("migrate reset");
    expect(workflow).not.toMatch(/\bdeploy(?:ment)?\b.*production/i);
  });

  it("keeps the demo seed explicit, idempotent and free from destructive writes", async () => {
    const demoSeed = await readFile("prisma/demo-seed.ts", "utf8");
    const demoConfig = await readFile(
      "src/server/demo/demo-seed-config.ts",
      "utf8"
    );

    expect(demoConfig).toContain("Demo seed is forbidden in production.");
    expect(demoConfig).toContain("FIXFLOW_DEMO_SEED_ENABLED");
    expect(demoSeed).toContain(".upsert(");
    expect(demoSeed).not.toContain(".delete");
    expect(demoSeed).not.toContain("console.log(config");
  });
});
