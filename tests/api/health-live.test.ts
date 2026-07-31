import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/live/route";

describe("GET /api/health/live", () => {
  it("returns a non-cacheable safe liveness payload", async () => {
    const response = GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toMatchObject({
      status: "ok"
    });
    expect(payload.version).toEqual(expect.any(String));
    expect(payload.release).toEqual(expect.any(String));
    expect(JSON.stringify(payload)).not.toContain("DATABASE_URL");
  });
});
