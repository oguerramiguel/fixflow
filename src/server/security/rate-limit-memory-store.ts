import type {
  RateLimitStore,
  RateLimitStoreIncrementInput,
  RateLimitStoreIncrementResult
} from "@/server/security/rate-limit-store";

type MemoryRateLimitCounter = {
  operation: string;
  keyHash: string;
  windowStart: Date;
  windowExpiresAt: Date;
  count: number;
};

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, MemoryRateLimitCounter>();

  async increment(
    input: RateLimitStoreIncrementInput
  ): Promise<RateLimitStoreIncrementResult> {
    this.deleteExpiredCounters(input.now);

    const key = this.createKey(input);
    const existingCounter = this.counters.get(key);

    if (existingCounter) {
      existingCounter.count += 1;

      return {
        count: existingCounter.count,
        resetAt: existingCounter.windowExpiresAt
      };
    }

    const counter: MemoryRateLimitCounter = {
      operation: input.operation,
      keyHash: input.keyHash,
      windowStart: input.windowStart,
      windowExpiresAt: input.windowExpiresAt,
      count: 1
    };

    this.counters.set(key, counter);

    return {
      count: counter.count,
      resetAt: counter.windowExpiresAt
    };
  }

  reset(): void {
    this.counters.clear();
  }

  snapshot(): MemoryRateLimitCounter[] {
    return [...this.counters.values()].map((counter) => ({
      ...counter,
      windowStart: new Date(counter.windowStart),
      windowExpiresAt: new Date(counter.windowExpiresAt)
    }));
  }

  private createKey(input: RateLimitStoreIncrementInput): string {
    return [
      input.operation,
      input.keyHash,
      input.windowStart.toISOString()
    ].join(":");
  }

  private deleteExpiredCounters(now: Date): void {
    for (const [key, counter] of this.counters.entries()) {
      if (counter.windowExpiresAt <= now) {
        this.counters.delete(key);
      }
    }
  }
}

export const globalInMemoryRateLimitStore = new InMemoryRateLimitStore();
