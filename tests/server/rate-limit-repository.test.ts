import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $executeRaw: mocks.executeRaw
  }
}));

import {
  deleteExpiredRateLimitCounters,
  prismaRateLimitStore
} from "@/server/security/rate-limit-repository";

describe("rate limit repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments counters by operation, key hash and fixed window", async () => {
    const windowStart = new Date("2026-07-14T12:00:00.000Z");
    const windowExpiresAt = new Date("2026-07-14T12:05:00.000Z");

    mocks.queryRaw.mockResolvedValueOnce([
      {
        count: 2,
        windowExpiresAt
      }
    ]);

    const result = await prismaRateLimitStore.increment({
      operation: "LOGIN_ATTEMPT",
      keyHash: "key-hash",
      windowStart,
      windowExpiresAt,
      now: new Date("2026-07-14T12:00:10.000Z")
    });

    expect(result).toEqual({
      count: 2,
      resetAt: windowExpiresAt
    });
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    const sql = [...mocks.queryRaw.mock.calls[0][0]].join("");

    expect(sql).toContain('INSERT INTO "RateLimitCounter"');
    expect(sql).toContain(
      'ON CONFLICT ("operation", "keyHash", "windowStart")'
    );
    expect(JSON.stringify(mocks.queryRaw.mock.calls[0])).not.toContain(
      "raw-session-token"
    );
  });

  it("deletes expired counters for operational cleanup", async () => {
    const now = new Date("2026-07-14T12:00:00.000Z");

    mocks.executeRaw.mockResolvedValueOnce(3);

    await expect(deleteExpiredRateLimitCounters(now)).resolves.toBe(3);
    const sql = [...mocks.executeRaw.mock.calls[0][0]].join("");

    expect(sql).toContain('DELETE FROM "RateLimitCounter"');
  });
});
