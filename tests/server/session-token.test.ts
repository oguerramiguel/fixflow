import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashSessionToken
} from "@/server/auth/session-token";

describe("session token", () => {
  it("generates non-empty tokens", () => {
    expect(createSessionToken()).not.toHaveLength(0);
  });

  it("generates different tokens", () => {
    expect(createSessionToken()).not.toBe(createSessionToken());
  });

  it("hashes deterministically for the same token", () => {
    const token = createSessionToken();

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("changes the hash for different tokens", () => {
    expect(hashSessionToken(createSessionToken())).not.toBe(
      hashSessionToken(createSessionToken())
    );
  });
});
