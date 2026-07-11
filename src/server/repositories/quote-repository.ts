import { Prisma, QuoteStatus } from "@prisma/client";
import type { QuoteStatus as DomainQuoteStatus } from "@/domain/entities/quote";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import type { ServiceOrderTimelineType } from "@/domain/services/service-order-timeline";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const quoteDetailsSelect = {
  id: true,
  serviceOrderId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      description: true,
      quantity: true,
      unitPrice: true,
      createdAt: true,
      updatedAt: true
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
} satisfies Prisma.QuoteSelect;

const quoteItemRecordSelect = {
  id: true,
  quoteId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.QuoteItemSelect;

export type QuoteDetailsRecord = Prisma.QuoteGetPayload<{
  select: typeof quoteDetailsSelect;
}>;

export type QuoteItemRecord = Prisma.QuoteItemGetPayload<{
  select: typeof quoteItemRecordSelect;
}>;

export type CreateDraftQuoteRecordInput = {
  serviceOrderId: string;
  timeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
};

export type QuoteItemRecordInput = {
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
};

export type TransitionQuoteWithServiceOrderInput = {
  quoteId: string;
  serviceOrderId: string;
  expectedQuoteStatus: DomainQuoteStatus;
  targetQuoteStatus: DomainQuoteStatus;
  expectedServiceOrderStatus: ServiceOrderStatus;
  targetServiceOrderStatus: ServiceOrderStatus;
  quoteTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
  serviceOrderTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
};

export class QuoteAlreadyExistsError extends Error {
  constructor() {
    super("Quote already exists for this service order.");
    this.name = "QuoteAlreadyExistsError";
  }
}

class OptimisticQuoteTransitionConflictError extends Error {
  constructor() {
    super("Optimistic quote transition conflict.");
    this.name = "OptimisticQuoteTransitionConflictError";
  }
}

function isQuoteServiceOrderUniqueConstraintError(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("serviceOrderId") && target.includes("organizationId");
  }

  return (
    typeof target === "string" &&
    target.includes("serviceOrderId") &&
    target.includes("organizationId")
  );
}

export async function findQuoteByServiceOrder(
  context: TenantContext,
  serviceOrderId: string
): Promise<QuoteDetailsRecord | null> {
  return prisma.quote.findFirst({
    where: {
      serviceOrderId,
      organizationId: context.organizationId
    },
    select: quoteDetailsSelect
  });
}

export async function findQuoteById(
  context: TenantContext,
  quoteId: string
): Promise<QuoteDetailsRecord | null> {
  return prisma.quote.findFirst({
    where: {
      id: quoteId,
      organizationId: context.organizationId
    },
    select: quoteDetailsSelect
  });
}

export async function createDraftQuoteWithTimeline(
  context: TenantContext,
  input: CreateDraftQuoteRecordInput
): Promise<QuoteDetailsRecord> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const quote = await transaction.quote.create({
        data: {
          organizationId: context.organizationId,
          serviceOrderId: input.serviceOrderId,
          status: QuoteStatus.DRAFT
        },
        select: quoteDetailsSelect
      });

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: context.organizationId,
          serviceOrderId: input.serviceOrderId,
          type: input.timeline.type,
          description: input.timeline.description
        }
      });

      return quote;
    });
  } catch (error) {
    if (isQuoteServiceOrderUniqueConstraintError(error)) {
      throw new QuoteAlreadyExistsError();
    }

    throw error;
  }
}

export async function addQuoteItem(
  context: TenantContext,
  quoteId: string,
  input: QuoteItemRecordInput
): Promise<QuoteItemRecord> {
  return prisma.quoteItem.create({
    data: {
      organizationId: context.organizationId,
      quoteId,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice
    },
    select: quoteItemRecordSelect
  });
}

export async function updateQuoteItem(
  context: TenantContext,
  quoteId: string,
  quoteItemId: string,
  input: QuoteItemRecordInput
): Promise<QuoteItemRecord | null> {
  const updateResult = await prisma.quoteItem.updateMany({
    where: {
      id: quoteItemId,
      quoteId,
      organizationId: context.organizationId
    },
    data: {
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice
    }
  });

  if (updateResult.count === 0) {
    return null;
  }

  return prisma.quoteItem.findFirst({
    where: {
      id: quoteItemId,
      quoteId,
      organizationId: context.organizationId
    },
    select: quoteItemRecordSelect
  });
}

export async function removeQuoteItem(
  context: TenantContext,
  quoteId: string,
  quoteItemId: string
): Promise<boolean> {
  const deleteResult = await prisma.quoteItem.deleteMany({
    where: {
      id: quoteItemId,
      quoteId,
      organizationId: context.organizationId
    }
  });

  return deleteResult.count > 0;
}

export async function transitionQuoteWithServiceOrder(
  context: TenantContext,
  input: TransitionQuoteWithServiceOrderInput
): Promise<QuoteDetailsRecord | null> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const quoteUpdateResult = await transaction.quote.updateMany({
        where: {
          id: input.quoteId,
          organizationId: context.organizationId,
          status: input.expectedQuoteStatus
        },
        data: {
          status: input.targetQuoteStatus
        }
      });

      if (quoteUpdateResult.count === 0) {
        throw new OptimisticQuoteTransitionConflictError();
      }

      const serviceOrderUpdateResult = await transaction.serviceOrder.updateMany({
        where: {
          id: input.serviceOrderId,
          organizationId: context.organizationId,
          status: input.expectedServiceOrderStatus
        },
        data: {
          status: input.targetServiceOrderStatus
        }
      });

      if (serviceOrderUpdateResult.count === 0) {
        throw new OptimisticQuoteTransitionConflictError();
      }

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: context.organizationId,
          serviceOrderId: input.serviceOrderId,
          type: input.quoteTimeline.type,
          description: input.quoteTimeline.description
        }
      });

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: context.organizationId,
          serviceOrderId: input.serviceOrderId,
          type: input.serviceOrderTimeline.type,
          description: input.serviceOrderTimeline.description
        }
      });

      const quote = await transaction.quote.findFirst({
        where: {
          id: input.quoteId,
          organizationId: context.organizationId
        },
        select: quoteDetailsSelect
      });

      if (!quote) {
        throw new Error("Quote was not found after status transition.");
      }

      return quote;
    });
  } catch (error) {
    if (error instanceof OptimisticQuoteTransitionConflictError) {
      return null;
    }

    throw error;
  }
}
