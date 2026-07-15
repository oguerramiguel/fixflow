export type RateLimitWindow = {
  windowStart: Date;
  windowExpiresAt: Date;
};

export type RateLimitStoreIncrementInput = RateLimitWindow & {
  operation: string;
  keyHash: string;
  now: Date;
};

export type RateLimitStoreIncrementResult = {
  count: number;
  resetAt: Date;
};

export type RateLimitStore = {
  increment(
    input: RateLimitStoreIncrementInput
  ): Promise<RateLimitStoreIncrementResult>;
};

export function createFixedRateLimitWindow(
  now: Date,
  windowSeconds: number
): RateLimitWindow {
  const windowSizeMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(now.getTime() / windowSizeMs) * windowSizeMs;
  const windowStart = new Date(windowStartMs);

  return {
    windowStart,
    windowExpiresAt: new Date(windowStartMs + windowSizeMs)
  };
}
