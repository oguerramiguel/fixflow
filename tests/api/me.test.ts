import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/domain/errors/authentication-error";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/authenticated-context", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));

import { GET } from "@/app/api/me/route";

describe("GET /api/me", () => {
  it("returns a safe DTO for an authenticated user", async () => {
    mocks.requireCurrentUser.mockResolvedValueOnce({
      id: "user-1",
      organizationId: "org-1",
      name: "Owner",
      email: "owner@example.com",
      role: UserRole.OWNER,
      organization: {
        id: "org-1",
        name: "FixFlow Lab",
        slug: "fixflow-lab"
      }
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: {
        id: "user-1",
        name: "Owner",
        email: "owner@example.com",
        role: UserRole.OWNER
      },
      organization: {
        id: "org-1",
        name: "FixFlow Lab",
        slug: "fixflow-lab"
      }
    });
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("token");
    expect(JSON.stringify(body)).not.toContain("tokenHash");
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.requireCurrentUser.mockRejectedValueOnce(new AuthenticationError());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
