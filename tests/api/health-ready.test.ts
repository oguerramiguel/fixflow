import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getReadiness: vi.fn()
}));

vi.mock("@/server/operations/health-service", () => ({
  getReadiness: mocks.getReadiness
}));

import { GET } from "@/app/api/health/ready/route";

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns HTTP 200 when dependencies are ready", async () => {
    mocks.getReadiness.mockResolvedValue({
      status: "ready",
      version: "0.1.0",
      release: "abcdef123456"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      version: "0.1.0",
      release: "abcdef123456"
    });
  });

  it("returns HTTP 503 without database details when unavailable", async () => {
    mocks.getReadiness.mockResolvedValue({
      status: "unavailable",
      version: "0.1.0",
      release: "abcdef123456"
    });

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toContain("postgresql://");
    expect(body).not.toContain("Prisma");
  });
});
