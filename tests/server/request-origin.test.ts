import { describe, expect, it } from "vitest";
import { createSecurityRequestOrigin } from "@/server/security/request-origin";

describe("security request origin proxy policy", () => {
  it("ignores forwarded addresses unless the proxy is explicitly trusted", () => {
    const untrusted = createSecurityRequestOrigin({
      forwardedFor: "203.0.113.10",
      realIp: "203.0.113.11",
      userAgent: "Vitest",
      trustProxy: false
    });
    const noAddress = createSecurityRequestOrigin({
      userAgent: "Vitest",
      trustProxy: false
    });

    expect(untrusted).toEqual(noAddress);
    expect(untrusted.forwardedForHash).toBeUndefined();
  });

  it("uses only the first forwarded address behind a trusted proxy", () => {
    const origin = createSecurityRequestOrigin({
      forwardedFor: "203.0.113.10, 10.0.0.2",
      userAgent: "Vitest",
      trustProxy: true
    });

    expect(origin.forwardedForHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
