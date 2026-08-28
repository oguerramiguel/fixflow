import { Prisma } from "@prisma/client";
import type { QuoteStatus } from "@/domain/entities/quote";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const recentServiceOrderSelect = {
  id: true,
  publicCode: true,
  status: true,
  createdAt: true,
  customer: { select: { name: true } },
  equipment: { select: { brand: true, model: true } }
} satisfies Prisma.ServiceOrderSelect;

export type DashboardStatusCountRecord = {
  status: ServiceOrderStatus;
  _count: { _all: number };
};

export type DashboardQuoteStatusCountRecord = {
  status: QuoteStatus;
  _count: { _all: number };
};

export type DashboardRecentServiceOrderRecord = Prisma.ServiceOrderGetPayload<{
  select: typeof recentServiceOrderSelect;
}>;

export type DashboardRecord = {
  customerCount: number;
  equipmentCount: number;
  serviceOrderStatusCounts: DashboardStatusCountRecord[];
  quoteStatusCounts: DashboardQuoteStatusCountRecord[];
  serviceOrderCreationDates: { createdAt: Date }[];
  recentServiceOrders: DashboardRecentServiceOrderRecord[];
};

export async function getDashboardRecord(
  context: TenantContext,
  periodStart: Date
): Promise<DashboardRecord> {
  const tenantWhere = { organizationId: context.organizationId };
  const [customerCount, equipmentCount, serviceOrderStatusCounts, quoteStatusCounts, serviceOrderCreationDates, recentServiceOrders] = await Promise.all([
    prisma.customer.count({ where: tenantWhere }),
    prisma.equipment.count({ where: tenantWhere }),
    prisma.serviceOrder.groupBy({ by: ["status"], where: tenantWhere, _count: { _all: true } }),
    prisma.quote.groupBy({ by: ["status"], where: tenantWhere, _count: { _all: true } }),
    prisma.serviceOrder.findMany({
      where: { ...tenantWhere, createdAt: { gte: periodStart } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.serviceOrder.findMany({
      where: tenantWhere,
      select: recentServiceOrderSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 6
    })
  ]);

  return { customerCount, equipmentCount, serviceOrderStatusCounts, quoteStatusCounts, serviceOrderCreationDates, recentServiceOrders };
}
