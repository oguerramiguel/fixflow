import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns an ok status with HTTP 200", async () => {
    const response = GET();

    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.status).toBe(200);
  });
});
