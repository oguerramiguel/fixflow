import { describe, expect, it, vi } from "vitest";
import { getDashboardForOrganization } from "@/server/services/dashboard-service";

describe("dashboard service", () => {
  it("derives real metrics and fills empty months without placeholders", async () => {
    const getDashboardRecord = vi.fn().mockResolvedValue({
      customerCount: 12,
      equipmentCount: 18,
      serviceOrderStatusCounts: [
        { status: "RECEIVED", _count: { _all: 2 } },
        { status: "WAITING_FOR_APPROVAL", _count: { _all: 3 } },
        { status: "IN_REPAIR", _count: { _all: 4 } },
        { status: "COMPLETED", _count: { _all: 5 } },
        { status: "CANCELLED", _count: { _all: 1 } }
      ],
      quoteStatusCounts: [
        { status: "APPROVED", _count: { _all: 3 } },
        { status: "REJECTED", _count: { _all: 1 } }
      ],
      serviceOrderCreationDates: [
        { createdAt: new Date("2026-07-10T00:00:00.000Z") },
        { createdAt: new Date("2026-08-10T00:00:00.000Z") },
        { createdAt: new Date("2026-08-11T00:00:00.000Z") }
      ],
      recentServiceOrders: []
    });

    const result = await getDashboardForOrganization(
      { organizationId: "org-1" },
      { getDashboardRecord },
      new Date("2026-08-27T12:00:00.000Z")
    );

    expect(getDashboardRecord).toHaveBeenCalledWith(
      { organizationId: "org-1" },
      new Date("2026-03-01T00:00:00.000Z")
    );
    expect(result.metrics).toEqual({
      openServiceOrders: 9,
      waitingForApproval: 3,
      inProgress: 4,
      completed: 5,
      customers: 12,
      equipment: 18,
      quoteApprovalRate: 75
    });
    expect(result.monthlyVolume.map((month) => month.count)).toEqual([0, 0, 0, 0, 1, 2]);
  });
});
