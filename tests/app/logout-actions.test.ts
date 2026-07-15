import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  cookies: vi.fn(),
  resolveAuthenticatedContextFromSessionToken: vi.fn(),
  invalidateAuthSession: vi.fn(),
  getSecurityRequestOrigin: vi.fn(),
  recordSecurityAuditEvent: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("@/server/auth/authenticated-context", () => ({
  resolveAuthenticatedContextFromSessionToken:
    mocks.resolveAuthenticatedContextFromSessionToken
}));

vi.mock("@/server/auth/session-service", () => ({
  invalidateAuthSession: mocks.invalidateAuthSession
}));

vi.mock("@/server/security/request-origin", () => ({
  getSecurityRequestOrigin: mocks.getSecurityRequestOrigin
}));

vi.mock("@/server/security/security-audit-service", () => ({
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent
}));

import { logoutAction } from "@/app/app/actions";

describe("logout action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({
        value: "raw-session-token"
      })),
      set: vi.fn()
    });
    mocks.resolveAuthenticatedContextFromSessionToken.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      role: "OWNER"
    });
    mocks.invalidateAuthSession.mockResolvedValue(undefined);
    mocks.getSecurityRequestOrigin.mockResolvedValue({
      originHash: "origin-hash"
    });
    mocks.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("invalidates the session and records logout without the raw token", async () => {
    await expect(logoutAction()).rejects.toThrow("redirect:/login");

    expect(mocks.invalidateAuthSession).toHaveBeenCalledWith("raw-session-token");
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith({
      eventType: "LOGOUT",
      outcome: "SUCCESS",
      organizationId: "org-1",
      userId: "user-1",
      originHash: "origin-hash"
    });
    expect(JSON.stringify(mocks.recordSecurityAuditEvent.mock.calls)).not.toContain(
      "raw-session-token"
    );
  });
});
