import { describe, expect, it, vi } from "vitest";
import {
  getLiveness,
  getReadiness
} from "@/server/operations/health-service";

describe("health service", () => {
  it("reports liveness without checking external dependencies", () => {
    expect(
      getLiveness({
        NODE_ENV: "test",
        npm_package_version: "0.1.0",
        FIXFLOW_RELEASE_SHA: "abcdef123456"
      })
    ).toEqual({
      status: "ok",
      version: "0.1.0",
      release: "abcdef123456"
    });
  });

  it("reports readiness after a successful database check", async () => {
    const checkDatabase = vi.fn(async () => undefined);

    await expect(
      getReadiness({
        getTimeoutMs: () => 100,
        getIdentity: () => ({
          version: "0.1.0",
          release: "abcdef123456"
        }),
        checkDatabase
      })
    ).resolves.toEqual({
      status: "ready",
      version: "0.1.0",
      release: "abcdef123456"
    });
    expect(checkDatabase).toHaveBeenCalledOnce();
  });

  it("returns a safe unavailable result for failures and timeouts", async () => {
    const identity = {
      version: "0.1.0",
      release: "abcdef123456"
    };

    await expect(
      getReadiness({
        getTimeoutMs: () => 100,
        getIdentity: () => identity,
        checkDatabase: vi.fn(async () => {
          throw new Error("postgresql://secret@database/internal");
        })
      })
    ).resolves.toEqual({
      status: "unavailable",
      ...identity
    });

    await expect(
      getReadiness({
        getTimeoutMs: () => 5,
        getIdentity: () => identity,
        checkDatabase: vi.fn(() => new Promise<void>(() => undefined))
      })
    ).resolves.toEqual({
      status: "unavailable",
      ...identity
    });
  });
});
