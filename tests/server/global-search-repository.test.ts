import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ customer: { findMany: vi.fn() }, equipment: { findMany: vi.fn() }, serviceOrder: { findMany: vi.fn() } }));
vi.mock("@/server/db/prisma", () => ({ prisma: mocks }));
import { searchOrganizationRecords } from "@/server/repositories/global-search-repository";

describe("global search repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    for (const model of Object.values(mocks)) model.findMany.mockResolvedValue([]);
  });

  it.each(["org-a", "org-b"])("scopes every category and related search to %s, with bounded deterministic results", async (organizationId) => {
    await searchOrganizationRecords({ organizationId }, "Dell Inspiron");
    for (const model of Object.values(mocks)) {
      expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }), take: 5, orderBy: expect.arrayContaining([{ id: "asc" }]) }));
    }
    expect(mocks.equipment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId,
      AND: ["Dell", "Inspiron"].map((contains) => ({ OR: [
        { brand: { contains, mode: "insensitive" } }, { model: { contains, mode: "insensitive" } },
        { serialNumber: { contains, mode: "insensitive" } }, { customer: { organizationId, name: { contains, mode: "insensitive" } } }
      ] }))
    } }));
    expect(mocks.serviceOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId, AND: ["Dell", "Inspiron"].map((contains) => ({ OR: [
      { publicCode: { contains, mode: "insensitive" } }, { customer: { organizationId, name: { contains, mode: "insensitive" } } },
      { equipment: { organizationId, OR: [{ brand: { contains, mode: "insensitive" } }, { model: { contains, mode: "insensitive" } }, { serialNumber: { contains, mode: "insensitive" } }] } }
    ] })) } }));
  });

  it("returns only minimal navigation data, without customer contacts or internal notes", async () => {
    mocks.customer.findMany.mockResolvedValue([{ id: "c1", name: "Marcio", email: "private@example.test", organizationId: "org-a" }]);
    mocks.equipment.findMany.mockResolvedValue([{ id: "e1", brand: "Dell", model: "Inspiron", serialNumber: "SN123", notes: "private" }]);
    mocks.serviceOrder.findMany.mockResolvedValue([{ id: "s1", publicCode: "FF-EXAMPLE", reportedIssue: "private" }]);
    const result = await searchOrganizationRecords({ organizationId: "org-a" }, "Marcio");
    expect(result).toEqual([
      { kind: "customer", label: "Marcio", description: "Abrir cadastro do cliente", href: "/app/customers/c1" },
      { kind: "equipment", label: "Dell Inspiron", description: "Série: SN123", href: "/app/equipment/e1" },
      { kind: "service-order", label: "FF-EXAMPLE", description: "Abrir atendimento", href: "/app/service-orders/s1" }
    ]);
    expect(mocks.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true } }));
  });
});
