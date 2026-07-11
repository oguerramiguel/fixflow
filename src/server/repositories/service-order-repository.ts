import { Prisma, ServiceOrderStatus } from "@prisma/client";
import type { QuoteStatus as DomainQuoteStatus } from "@/domain/entities/quote";
import { LIST_PAGE_SIZE } from "@/domain/services/pagination";
import type { ServiceOrderStatus as DomainServiceOrderStatus } from "@/domain/entities/service-order";
import type { ServiceOrderTimelineType } from "@/domain/services/service-order-timeline";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const serviceOrderListSelect = {
  id: true,
  publicCode: true,
  reportedIssue: true,
  status: true,
  createdAt: true,
  customer: {
    select: {
      id: true,
      name: true
    }
  },
  equipment: {
    select: {
      id: true,
      type: true,
      brand: true,
      model: true,
      serialNumber: true
    }
  }
} satisfies Prisma.ServiceOrderSelect;

const serviceOrderRecordSelect = {
  id: true,
  publicCode: true,
  reportedIssue: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true
    }
  },
  equipment: {
    select: {
      id: true,
      type: true,
      brand: true,
      model: true,
      serialNumber: true
    }
  }
} satisfies Prisma.ServiceOrderSelect;

function buildServiceOrderDetailsSelect(
  context: TenantContext
): Prisma.ServiceOrderSelect {
  return {
    ...serviceOrderRecordSelect,
    diagnostic: {
      select: {
        id: true,
        description: true,
        updatedAt: true
      }
    },
    quote: {
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true
          }
        }
      }
    },
    timeline: {
      where: {
        organizationId: context.organizationId
      },
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true
      },
      orderBy: [
        {
          createdAt: "asc"
        },
        {
          id: "asc"
        }
      ]
    }
  } satisfies Prisma.ServiceOrderSelect;
}

export type ServiceOrderListRecord = Prisma.ServiceOrderGetPayload<{
  select: typeof serviceOrderListSelect;
}>;

export type ServiceOrderRecord = Prisma.ServiceOrderGetPayload<{
  select: typeof serviceOrderRecordSelect;
}>;

export type ServiceOrderDetailsRecord = ServiceOrderRecord & {
  diagnostic: {
    id: string;
    description: string;
    updatedAt: Date;
  } | null;
  quote: {
    id: string;
    status: DomainQuoteStatus;
    createdAt: Date;
    updatedAt: Date;
    items: {
      id: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
    }[];
  } | null;
  timeline: {
    id: string;
    type: string;
    description: string;
    createdAt: Date;
  }[];
};

export type ServiceOrderListRepositoryInput = {
  page: number;
  query?: string;
  status?: DomainServiceOrderStatus;
};

export type CreateServiceOrderRecordInput = {
  customerId: string;
  equipmentId: string;
  publicCode: string;
  reportedIssue: string;
  initialTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
};

export type TransitionServiceOrderStatusInput = {
  serviceOrderId: string;
  currentStatus: DomainServiceOrderStatus;
  targetStatus: DomainServiceOrderStatus;
  timeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
};

export class PublicCodeCollisionError extends Error {
  constructor() {
    super("Service order public code already exists.");
    this.name = "PublicCodeCollisionError";
  }
}

function buildServiceOrderWhere(
  context: TenantContext,
  input: {
    query?: string;
    status?: DomainServiceOrderStatus;
  }
): Prisma.ServiceOrderWhereInput {
  const where: Prisma.ServiceOrderWhereInput = {
    organizationId: context.organizationId
  };

  if (input.status) {
    where.status = input.status;
  }

  if (!input.query) {
    return where;
  }

  return {
    ...where,
    OR: [
      {
        publicCode: {
          contains: input.query,
          mode: "insensitive"
        }
      },
      {
        customer: {
          name: {
            contains: input.query,
            mode: "insensitive"
          }
        }
      },
      {
        equipment: {
          brand: {
            contains: input.query,
            mode: "insensitive"
          }
        }
      },
      {
        equipment: {
          model: {
            contains: input.query,
            mode: "insensitive"
          }
        }
      },
      {
        equipment: {
          serialNumber: {
            contains: input.query,
            mode: "insensitive"
          }
        }
      }
    ]
  };
}

function isPublicCodeUniqueConstraintError(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("publicCode");
  }

  return typeof target === "string" && target.includes("publicCode");
}

export async function listServiceOrders(
  context: TenantContext,
  input: ServiceOrderListRepositoryInput
): Promise<ServiceOrderListRecord[]> {
  return prisma.serviceOrder.findMany({
    where: buildServiceOrderWhere(context, input),
    select: serviceOrderListSelect,
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    skip: (input.page - 1) * LIST_PAGE_SIZE,
    take: LIST_PAGE_SIZE
  });
}

export async function countServiceOrders(
  context: TenantContext,
  input: {
    query?: string;
    status?: DomainServiceOrderStatus;
  }
): Promise<number> {
  return prisma.serviceOrder.count({
    where: buildServiceOrderWhere(context, input)
  });
}

export async function findServiceOrderById(
  context: TenantContext,
  serviceOrderId: string
): Promise<ServiceOrderDetailsRecord | null> {
  return prisma.serviceOrder.findFirst({
    where: {
      id: serviceOrderId,
      organizationId: context.organizationId
    },
    select: buildServiceOrderDetailsSelect(context)
  }) as Promise<ServiceOrderDetailsRecord | null>;
}

export async function createServiceOrderWithInitialTimeline(
  context: TenantContext,
  input: CreateServiceOrderRecordInput
): Promise<ServiceOrderRecord> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const serviceOrder = await transaction.serviceOrder.create({
        data: {
          organizationId: context.organizationId,
          customerId: input.customerId,
          equipmentId: input.equipmentId,
          publicCode: input.publicCode,
          reportedIssue: input.reportedIssue,
          status: ServiceOrderStatus.RECEIVED
        },
        select: serviceOrderRecordSelect
      });

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: context.organizationId,
          serviceOrderId: serviceOrder.id,
          type: input.initialTimeline.type,
          description: input.initialTimeline.description
        }
      });

      return serviceOrder;
    });
  } catch (error) {
    if (isPublicCodeUniqueConstraintError(error)) {
      throw new PublicCodeCollisionError();
    }

    throw error;
  }
}

export async function transitionServiceOrderStatus(
  context: TenantContext,
  input: TransitionServiceOrderStatusInput
): Promise<ServiceOrderRecord | null> {
  return prisma.$transaction(async (transaction) => {
    const updateResult = await transaction.serviceOrder.updateMany({
      where: {
        id: input.serviceOrderId,
        organizationId: context.organizationId,
        status: input.currentStatus
      },
      data: {
        status: input.targetStatus
      }
    });

    if (updateResult.count === 0) {
      return null;
    }

    await transaction.serviceOrderTimeline.create({
      data: {
        organizationId: context.organizationId,
        serviceOrderId: input.serviceOrderId,
        type: input.timeline.type,
        description: input.timeline.description
      }
    });

    const serviceOrder = await transaction.serviceOrder.findFirst({
      where: {
        id: input.serviceOrderId,
        organizationId: context.organizationId
      },
      select: serviceOrderRecordSelect
    });

    if (!serviceOrder) {
      throw new Error("Service order was not found after status transition.");
    }

    return serviceOrder;
  });
}
