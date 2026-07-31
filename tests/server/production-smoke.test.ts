import { describe, expect, it, vi } from "vitest";
import {
  parseSmokeBaseUrl,
  ProductionSmokeError,
  runProductionSmoke,
  type SmokeFetch
} from "@/server/operations/production-smoke";

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

function createSuccessfulFetch(): SmokeFetch {
  return vi.fn(async (input: string | URL) => {
    const url = new URL(input);

    switch (url.pathname) {
      case "/api/health/live":
        return Response.json({
          status: "ok",
          version: "0.1.0",
          release: "abcdef123456"
        });
      case "/api/health/ready":
        return Response.json({
          status: "ready",
          version: "0.1.0",
          release: "abcdef123456"
        });
      case "/":
        return new Response("<html>FixFlow</html>", {
          headers: securityHeaders
        });
      case "/login":
        return new Response("<html>Acesso interno</html>");
      case "/app":
        return new Response("", {
          status: 307,
          headers: {
            Location: "/login"
          }
        });
      default:
        return new Response("", { status: 404 });
    }
  });
}

describe("production smoke", () => {
  it("accepts the base URL from an argument or environment", () => {
    expect(
      parseSmokeBaseUrl(["--base-url", "https://fixflow.example"]).origin
    ).toBe("https://fixflow.example");
    expect(
      parseSmokeBaseUrl([], {
        NODE_ENV: "test",
        FIXFLOW_SMOKE_BASE_URL: "http://localhost:3100"
      }).origin
    ).toBe("http://localhost:3100");
  });

  it("checks only safe GET endpoints without credentials or mutations", async () => {
    const fetchImplementation = createSuccessfulFetch();
    const result = await runProductionSmoke(
      new URL("http://localhost:3100"),
      fetchImplementation
    );

    expect(result.checks).toContain("protected_redirect");
    expect(fetchImplementation).toHaveBeenCalledTimes(5);

    for (const call of vi.mocked(fetchImplementation).mock.calls) {
      expect(call[1]).toMatchObject({
        method: "GET"
      });
      expect(call[1]?.headers).not.toHaveProperty("Authorization");
      expect(call[1]?.body).toBeUndefined();
    }
  });

  it("rejects leaked implementation details and unsafe protected access", async () => {
    const leakedFetch = createSuccessfulFetch();
    vi.mocked(leakedFetch).mockResolvedValueOnce(
      new Response("PrismaClient database failure", { status: 500 })
    );

    await expect(
      runProductionSmoke(
        new URL("http://localhost:3100"),
        leakedFetch
      )
    ).rejects.toBeInstanceOf(ProductionSmokeError);

    const fallbackFetch = createSuccessfulFetch();
    const unprotectedFetch: SmokeFetch = vi.fn(async (input, init) => {
      if (new URL(input).pathname === "/app") {
        return new Response("<html>private data</html>", { status: 200 });
      }

      return fallbackFetch(input, init);
    });

    await expect(
      runProductionSmoke(
        new URL("http://localhost:3100"),
        unprotectedFetch
      )
    ).rejects.toThrow("did not redirect");
  });
});
