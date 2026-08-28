import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  customerCount: vi.fn(),
  equipmentCount: vi.fn(),
  serviceOrderGroupBy: vi.fn(),
  quoteGroupBy: vi.fn(),
  serviceOrderFindMany: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    customer: { count: mocks.customerCount },
    equipment: { count: mocks.equipmentCount },
    serviceOrder: { groupBy: mocks.serviceOrderGroupBy, findMany: mocks.serviceOrderFindMany },
    quote: { groupBy: mocks.quoteGroupBy }
  }
}));

import { getDashboardRecord } from "@/server/repositories/dashboard-repository";

const context: TenantContext = { organizationId: "org-1" };

describe("dashboard repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.customerCount.mockResolvedValue(0);
    mocks.equipmentCount.mockResolvedValue(0);
    mocks.serviceOrderGroupBy.mockResolvedValue([]);
    mocks.quoteGroupBy.mockResolvedValue([]);
    mocks.serviceOrderFindMany.mockResolvedValue([]);
  });

  it("scopes every dashboard query to the authenticated organization", async () => {
    const periodStart = new Date("2026-03-01T00:00:00.000Z");
    await getDashboardRecord(context, periodStart);

    expect(mocks.customerCount).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
    expect(mocks.equipmentCount).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
    expect(mocks.serviceOrderGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
    expect(mocks.quoteGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
    expect(mocks.serviceOrderFindMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { organizationId: "org-1", createdAt: { gte: periodStart } }
    }));
    expect(mocks.serviceOrderFindMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { organizationId: "org-1" }, take: 6
    }));
  });
});
