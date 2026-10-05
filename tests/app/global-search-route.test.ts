import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { ValidationError } from "@/domain/errors/validation-error";
const mocks = vi.hoisted(() => ({ context: vi.fn(), search: vi.fn() }));
vi.mock("@/server/auth/authenticated-context", () => ({ requireAuthenticatedContext: mocks.context }));
vi.mock("@/server/services/global-search-service", () => ({ searchForOrganization: mocks.search }));
import { GET } from "@/app/api/search/route";
const context = { organizationId: "org-from-session", userId: "u1", role: "OWNER" };

describe("global search route", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.context.mockResolvedValue(context); mocks.search.mockResolvedValue([]); });
  it("ignores browser tenant fields and disables caching", async () => {
    const response = await GET(new Request("http://localhost/api/search?query=Marcio&organizationId=foreign-org"));
    expect(mocks.search).toHaveBeenCalledWith(context, "Marcio");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ results: [] });
  });
  it("requires authentication even for an empty query", async () => {
    mocks.context.mockRejectedValue(new AuthenticationError());
    const response = await GET(new Request("http://localhost/api/search"));
    expect(response.status).toBe(401);
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it("reports input errors separately from server failures", async () => {
    mocks.search.mockRejectedValueOnce(new ValidationError("Use até 100 caracteres na busca.", {}));
    expect((await GET(new Request("http://localhost/api/search?query=bad"))).status).toBe(400);
    mocks.search.mockRejectedValueOnce(new Error("private database connection details"));
    const response = await GET(new Request("http://localhost/api/search?query=Marcio"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
