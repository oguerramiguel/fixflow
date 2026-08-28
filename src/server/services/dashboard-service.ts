import type { QuoteStatus } from "@/domain/entities/quote";
import { serviceOrderStatuses, type ServiceOrderStatus } from "@/domain/entities/service-order";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";
import { getDashboardRecord, type DashboardRecord } from "@/server/repositories/dashboard-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

const ACTIVE_PROGRESS_STATUSES: ServiceOrderStatus[] = ["APPROVED", "IN_REPAIR", "FINAL_TESTING", "READY_FOR_PICKUP"];

export type DashboardDto = {
  metrics: {
    openServiceOrders: number;
    waitingForApproval: number;
    inProgress: number;
    completed: number;
    customers: number;
    equipment: number;
    quoteApprovalRate: number | null;
  };
  statusDistribution: Array<{ status: ServiceOrderStatus; label: string; count: number }>;
  monthlyVolume: Array<{ key: string; label: string; count: number }>;
  recentServiceOrders: Array<{
    id: string;
    publicCode: string;
    status: ServiceOrderStatus;
    statusLabel: string;
    createdAt: Date;
    customerName: string;
    equipmentName: string;
  }>;
};

export type DashboardServiceDependencies = {
  getDashboardRecord(context: TenantContext, periodStart: Date): Promise<DashboardRecord>;
};

const defaultDependencies: DashboardServiceDependencies = { getDashboardRecord };

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCount<TStatus extends string>(counts: Array<{ status: TStatus; _count: { _all: number } }>, status: TStatus): number {
  return counts.find((item) => item.status === status)?._count._all ?? 0;
}

function getQuoteApprovalRate(counts: Array<{ status: QuoteStatus; _count: { _all: number } }>): number | null {
  const approved = getCount(counts, "APPROVED");
  const rejected = getCount(counts, "REJECTED");
  const decided = approved + rejected;
  return decided === 0 ? null : Math.round((approved / decided) * 100);
}

export async function getDashboardForOrganization(
  context: TenantContext,
  dependencies = defaultDependencies,
  now = new Date()
): Promise<DashboardDto> {
  const currentMonth = startOfMonth(now);
  const periodStart = addUtcMonths(currentMonth, -5);
  const record = await dependencies.getDashboardRecord(context, periodStart);
  const statusCounts = new Map(record.serviceOrderStatusCounts.map((item) => [item.status, item._count._all]));
  const totalServiceOrders = Array.from(statusCounts.values()).reduce((total, count) => total + count, 0);
  const completed = statusCounts.get("COMPLETED") ?? 0;
  const cancelled = statusCounts.get("CANCELLED") ?? 0;
  const monthlyCounts = new Map<string, number>();

  for (const serviceOrder of record.serviceOrderCreationDates) {
    const key = monthKey(serviceOrder.createdAt);
    monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
  }

  const monthlyVolume = Array.from({ length: 6 }, (_, index) => {
    const date = addUtcMonths(periodStart, index);
    const key = monthKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", ""),
      count: monthlyCounts.get(key) ?? 0
    };
  });

  return {
    metrics: {
      openServiceOrders: totalServiceOrders - completed - cancelled,
      waitingForApproval: statusCounts.get("WAITING_FOR_APPROVAL") ?? 0,
      inProgress: ACTIVE_PROGRESS_STATUSES.reduce((total, status) => total + (statusCounts.get(status) ?? 0), 0),
      completed,
      customers: record.customerCount,
      equipment: record.equipmentCount,
      quoteApprovalRate: getQuoteApprovalRate(record.quoteStatusCounts)
    },
    statusDistribution: serviceOrderStatuses
      .map((status) => ({ status, label: getServiceOrderStatusLabel(status), count: statusCounts.get(status) ?? 0 }))
      .filter((item) => item.count > 0),
    monthlyVolume,
    recentServiceOrders: record.recentServiceOrders.map((serviceOrder) => ({
      id: serviceOrder.id,
      publicCode: serviceOrder.publicCode,
      status: serviceOrder.status,
      statusLabel: getServiceOrderStatusLabel(serviceOrder.status),
      createdAt: serviceOrder.createdAt,
      customerName: serviceOrder.customer.name,
      equipmentName: `${serviceOrder.equipment.brand} ${serviceOrder.equipment.model}`
    }))
  };
}
