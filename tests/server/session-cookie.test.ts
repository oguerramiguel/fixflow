import { describe, expect, it } from "vitest";
import { shouldUseSecureSessionCookie } from "@/server/auth/session-cookie";

describe("session cookie runtime policy", () => {
  it("uses secure cookies for staging and production", () => {
    expect(
      shouldUseSecureSessionCookie({
        NODE_ENV: "production",
        FIXFLOW_APP_ENV: "staging"
      })
    ).toBe(true);
    expect(
      shouldUseSecureSessionCookie({
        NODE_ENV: "production",
        FIXFLOW_APP_ENV: "production"
      })
    ).toBe(true);
  });

  it("does not require secure transport during local development", () => {
    expect(
      shouldUseSecureSessionCookie({
        NODE_ENV: "development",
        FIXFLOW_APP_ENV: "development"
      })
    ).toBe(false);
  });
});
