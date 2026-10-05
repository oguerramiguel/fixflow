import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";
import type { SearchResult } from "@/lib/global-search";

const RESULTS_PER_KIND = 5;

export async function searchOrganizationRecords(
  context: TenantContext,
  query: string
): Promise<SearchResult[]> {
  const organizationId = context.organizationId;
  const terms = query.split(" ").map((contains) => ({ contains, mode: "insensitive" as const }));
  const [customers, equipment, orders] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId, AND: terms.map((term) => ({ OR: [{ name: term }, { email: term }, { phone: term }] })) },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: RESULTS_PER_KIND
    }),
    prisma.equipment.findMany({
      where: { organizationId, AND: terms.map((term) => ({ OR: [
        { brand: term }, { model: term }, { serialNumber: term },
        { customer: { organizationId, name: term } }
      ] })) },
      select: { id: true, brand: true, model: true, serialNumber: true },
      orderBy: [{ brand: "asc" }, { model: "asc" }, { id: "asc" }],
      take: RESULTS_PER_KIND
    }),
    prisma.serviceOrder.findMany({
      where: { organizationId, AND: terms.map((term) => ({ OR: [
        { publicCode: term },
        { customer: { organizationId, name: term } },
        { equipment: { organizationId, OR: [{ brand: term }, { model: term }, { serialNumber: term }] } }
      ] })) },
      select: { id: true, publicCode: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: RESULTS_PER_KIND
    })
  ]);

  return [
    ...customers.map((customer): SearchResult => ({ kind: "customer", label: customer.name, description: "Abrir cadastro do cliente", href: `/app/customers/${customer.id}` })),
    ...equipment.map((item): SearchResult => ({ kind: "equipment", label: `${item.brand} ${item.model}`, description: item.serialNumber ? `Série: ${item.serialNumber}` : "Sem número de série", href: `/app/equipment/${item.id}` })),
    ...orders.map((order): SearchResult => ({ kind: "service-order", label: order.publicCode, description: "Abrir atendimento", href: `/app/service-orders/${order.id}` }))
  ];
}
