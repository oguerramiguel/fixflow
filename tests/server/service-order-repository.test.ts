import { Prisma, ServiceOrderStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  serviceOrder: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn()
  },
  serviceOrderTimeline: {
    create: vi.fn()
  },
  transaction: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    serviceOrder: mocks.serviceOrder,
    serviceOrderTimeline: mocks.serviceOrderTimeline,
    $transaction: mocks.transaction
  }
}));

import {
  countServiceOrders,
  createServiceOrderWithInitialTimeline,
  findServiceOrderById,
  listServiceOrders,
  PublicCodeCollisionError,
  transitionServiceOrderStatus
} from "@/server/repositories/service-order-repository";

const context: TenantContext = {
  organizationId: "org-1"
};

const now = new Date("2026-07-10T00:00:00.000Z");

const serviceOrderRecord = {
  id: "service-order-1",
  publicCode: "FF-ABCDEFG234",
  reportedIssue: "Tela apagando.",
  status: ServiceOrderStatus.RECEIVED,
  createdAt: now,
  updatedAt: now,
  customer: {
    id: "customer-1",
    name: "Maria",
    email: null,
    phone: "11999999999"
  },
  equipment: {
    id: "equipment-1",
    type: "NOTEBOOK",
    brand: "Dell",
    model: "Latitude",
    serialNumber: null
  }
};

function createPrismaKnownError(
  target: string[]
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed.", {
    code: "P2002",
    clientVersion: "test",
    meta: {
      target
    }
  });
}

describe("service order repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceOrder: mocks.serviceOrder,
        serviceOrderTimeline: mocks.serviceOrderTimeline
      })
    );
  });

  it("lists service orders using organizationId, search and status filters", async () => {
    mocks.serviceOrder.findMany.mockResolvedValueOnce([]);

    await listServiceOrders(context, {
      page: 2,
      query: "dell",
      status: "IN_DIAGNOSIS"
    });

    expect(mocks.serviceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: "IN_DIAGNOSIS",
          OR: expect.any(Array)
        }),
        skip: 20,
        take: 20
      })
    );
  });

  it("counts service orders with the same tenant, search and status filters", async () => {
    mocks.serviceOrder.count.mockResolvedValueOnce(0);

    await countServiceOrders(context, {
      query: "maria",
      status: "RECEIVED"
    });

    expect(mocks.serviceOrder.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        status: "RECEIVED",
        OR: expect.any(Array)
      })
    });
  });

  it("finds details by id and organizationId with tenant-scoped timeline", async () => {
    mocks.serviceOrder.findFirst.mockResolvedValueOnce(null);

    await findServiceOrderById(context, "service-order-1");

    expect(mocks.serviceOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "service-order-1",
          organizationId: "org-1"
        },
        select: expect.objectContaining({
          timeline: expect.objectContaining({
            where: {
              organizationId: "org-1"
            }
          })
        })
      })
    );
  });

  it("creates service order and initial timeline in one transaction", async () => {
    mocks.serviceOrder.create.mockResolvedValueOnce(serviceOrderRecord);
    mocks.serviceOrderTimeline.create.mockResolvedValueOnce({
      id: "timeline-1"
    });

    await createServiceOrderWithInitialTimeline(context, {
      customerId: "customer-1",
      equipmentId: "equipment-1",
      publicCode: "FF-ABCDEFG234",
      reportedIssue: "Tela apagando.",
      initialTimeline: {
        type: "SERVICE_ORDER_CREATED",
        description: "Ordem de servico aberta com status Recebido."
      }
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.serviceOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          customerId: "customer-1",
          equipmentId: "equipment-1",
          publicCode: "FF-ABCDEFG234",
          reportedIssue: "Tela apagando.",
          status: ServiceOrderStatus.RECEIVED
        })
      })
    );
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        serviceOrderId: "service-order-1",
        type: "SERVICE_ORDER_CREATED",
        description: "Ordem de servico aberta com status Recebido."
      }
    });
  });

  it("wraps only publicCode unique conflicts as public code collisions", async () => {
    mocks.transaction.mockRejectedValueOnce(
      createPrismaKnownError(["publicCode"])
    );

    await expect(
      createServiceOrderWithInitialTimeline(context, {
        customerId: "customer-1",
        equipmentId: "equipment-1",
        publicCode: "FF-ABCDEFG234",
        reportedIssue: "Tela apagando.",
        initialTimeline: {
          type: "SERVICE_ORDER_CREATED",
          description: "Ordem de servico aberta com status Recebido."
        }
      })
    ).rejects.toThrow(PublicCodeCollisionError);
  });

  it("does not treat unrelated unique conflicts as public code collisions", async () => {
    const error = createPrismaKnownError(["customerId"]);
    mocks.transaction.mockRejectedValueOnce(error);

    await expect(
      createServiceOrderWithInitialTimeline(context, {
        customerId: "customer-1",
        equipmentId: "equipment-1",
        publicCode: "FF-ABCDEFG234",
        reportedIssue: "Tela apagando.",
        initialTimeline: {
          type: "SERVICE_ORDER_CREATED",
          description: "Ordem de servico aberta com status Recebido."
        }
      })
    ).rejects.toBe(error);
  });

  it("transitions status with tenant and expected current status filter", async () => {
    mocks.serviceOrder.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrderTimeline.create.mockResolvedValueOnce({
      id: "timeline-1"
    });
    mocks.serviceOrder.findFirst.mockResolvedValueOnce({
      ...serviceOrderRecord,
      status: ServiceOrderStatus.IN_DIAGNOSIS
    });

    await transitionServiceOrderStatus(context, {
      serviceOrderId: "service-order-1",
      currentStatus: "RECEIVED",
      targetStatus: "IN_DIAGNOSIS",
      timeline: {
        type: "STATUS_CHANGED",
        description: "Status alterado de Recebido para Em diagnostico."
      }
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.serviceOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: "service-order-1",
        organizationId: "org-1",
        status: "RECEIVED"
      },
      data: {
        status: "IN_DIAGNOSIS"
      }
    });
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        serviceOrderId: "service-order-1",
        type: "STATUS_CHANGED",
        description: "Status alterado de Recebido para Em diagnostico."
      }
    });
  });

  it("does not create timeline when optimistic status update conflicts", async () => {
    mocks.serviceOrder.updateMany.mockResolvedValueOnce({
      count: 0
    });

    const result = await transitionServiceOrderStatus(context, {
      serviceOrderId: "service-order-1",
      currentStatus: "RECEIVED",
      targetStatus: "IN_DIAGNOSIS",
      timeline: {
        type: "STATUS_CHANGED",
        description: "Status alterado de Recebido para Em diagnostico."
      }
    });

    expect(result).toBeNull();
    expect(mocks.serviceOrderTimeline.create).not.toHaveBeenCalled();
  });
});
