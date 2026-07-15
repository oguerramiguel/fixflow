import { describe, expect, it } from "vitest";
import {
  createContentSecurityPolicy,
  getHttpSecurityHeaders
} from "@/server/security/http-security-headers";

function getHeaderValue(headers: { key: string; value: string }[], key: string) {
  return headers.find((header) => header.key === key)?.value;
}

describe("HTTP security headers", () => {
  it("includes baseline security headers", () => {
    const headers = getHttpSecurityHeaders("development");

    expect(getHeaderValue(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(getHeaderValue(headers, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(getHeaderValue(headers, "Permissions-Policy")).toContain("camera=()");
    expect(getHeaderValue(headers, "X-Frame-Options")).toBe("DENY");
    expect(getHeaderValue(headers, "Content-Security-Policy")).toContain(
      "frame-ancestors 'none'"
    );
  });

  it("keeps development CSP compatible with Next.js development runtime", () => {
    const csp = createContentSecurityPolicy("development");

    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
  });

  it("includes HSTS only in production", () => {
    const developmentHeaders = getHttpSecurityHeaders("development");
    const productionHeaders = getHttpSecurityHeaders("production");

    expect(
      getHeaderValue(developmentHeaders, "Strict-Transport-Security")
    ).toBeUndefined();
    expect(
      getHeaderValue(productionHeaders, "Strict-Transport-Security")
    ).toContain("max-age=");
    expect(createContentSecurityPolicy("production")).not.toContain(
      "'unsafe-eval'"
    );
    expect(createContentSecurityPolicy("production")).toContain(
      "upgrade-insecure-requests"
    );
  });
});
