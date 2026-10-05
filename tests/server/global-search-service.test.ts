import { describe, expect, it, vi } from "vitest";
import { searchForOrganization } from "@/server/services/global-search-service";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";

const context: AuthenticatedContext = { organizationId: "trusted-org", userId: "u1", role: "TECHNICIAN" };
describe("global search service", () => {
  it.each(["", "  ", " A "])("avoids querying for short input %j", async (input) => {
    const search = vi.fn();
    expect(await searchForOrganization(context, input, search)).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
  it("rejects oversized input before querying", async () => {
    const search = vi.fn();
    await expect(searchForOrganization(context, "x".repeat(101), search)).rejects.toThrow("100 caracteres");
    expect(search).not.toHaveBeenCalled();
  });
  it("normalizes whitespace and forwards trusted context", async () => {
    const search = vi.fn().mockResolvedValue([]);
    await searchForOrganization(context, "  Dell   Inspiron  ", search);
    expect(search).toHaveBeenCalledWith(context, "Dell Inspiron");
  });
});
