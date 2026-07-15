import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import type {
  RateLimitStore,
  RateLimitStoreIncrementInput,
  RateLimitStoreIncrementResult
} from "@/server/security/rate-limit-store";

type RateLimitCounterRow = {
  count: number;
  windowExpiresAt: Date;
};

export const prismaRateLimitStore: RateLimitStore = {
  async increment(
    input: RateLimitStoreIncrementInput
  ): Promise<RateLimitStoreIncrementResult> {
    const counters = await prisma.$queryRaw<RateLimitCounterRow[]>`
      INSERT INTO "RateLimitCounter" (
        "id",
        "operation",
        "keyHash",
        "windowStart",
        "windowExpiresAt",
        "count",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.operation},
        ${input.keyHash},
        ${input.windowStart},
        ${input.windowExpiresAt},
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("operation", "keyHash", "windowStart")
      DO UPDATE SET
        "count" = "RateLimitCounter"."count" + 1,
        "windowExpiresAt" = EXCLUDED."windowExpiresAt",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "count", "windowExpiresAt";
    `;
    const counter = counters[0];

    if (!counter) {
      throw new Error("Rate limit counter upsert did not return a row.");
    }

    return {
      count: counter.count,
      resetAt: counter.windowExpiresAt
    };
  }
};

export async function deleteExpiredRateLimitCounters(
  now = new Date()
): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM "RateLimitCounter"
    WHERE "windowExpiresAt" < ${now};
  `;
}
