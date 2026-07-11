import { Prisma } from "@prisma/client";
import type { QuoteStatus as DomainQuoteStatus } from "@/domain/entities/quote";
import type { ServiceOrderStatus as DomainServiceOrderStatus } from "@/domain/entities/service-order";
import type { ServiceOrderTimelineType } from "@/domain/services/service-order-timeline";
import { prisma } from "@/server/db/prisma";

const publicServiceOrderSelect = {
  publicCode: true,
  reportedIssue: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  equipment: {
    select: {
      type: true,
      brand: true,
      model: true
    }
  },
  quote: {
    select: {
      status: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          description: true,
          quantity: true,
          unitPrice: true
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
    }
  },
  timeline: {
    select: {
      type: true,
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

const publicServiceOrderDecisionSelect = {
  id: true,
  organizationId: true,
  status: true,
  quote: {
    select: {
      id: true,
      status: true
    }
  }
} satisfies Prisma.ServiceOrderSelect;

export type PublicServiceOrderRecord = Prisma.ServiceOrderGetPayload<{
  select: typeof publicServiceOrderSelect;
}>;

export type PublicServiceOrderDecisionRecord = Prisma.ServiceOrderGetPayload<{
  select: typeof publicServiceOrderDecisionSelect;
}>;

export type PublicQuoteDecisionTransitionInput = {
  serviceOrderId: string;
  organizationId: string;
  quoteId: string;
  expectedQuoteStatus: DomainQuoteStatus;
  targetQuoteStatus: DomainQuoteStatus;
  expectedServiceOrderStatus: DomainServiceOrderStatus;
  targetServiceOrderStatus: DomainServiceOrderStatus;
  quoteTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
  serviceOrderTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
};

class OptimisticPublicQuoteDecisionConflictError extends Error {
  constructor() {
    super("Optimistic public quote decision conflict.");
    this.name = "OptimisticPublicQuoteDecisionConflictError";
  }
}

export async function findPublicServiceOrderByPublicCode(
  publicCode: string
): Promise<PublicServiceOrderRecord | null> {
  return prisma.serviceOrder.findUnique({
    where: {
      publicCode
    },
    select: publicServiceOrderSelect
  });
}

export async function findPublicServiceOrderDecisionByPublicCode(
  publicCode: string
): Promise<PublicServiceOrderDecisionRecord | null> {
  return prisma.serviceOrder.findUnique({
    where: {
      publicCode
    },
    select: publicServiceOrderDecisionSelect
  });
}

export async function transitionPublicQuoteDecision(
  input: PublicQuoteDecisionTransitionInput
): Promise<boolean> {
  try {
    await prisma.$transaction(async (transaction) => {
      const quoteUpdateResult = await transaction.quote.updateMany({
        where: {
          id: input.quoteId,
          organizationId: input.organizationId,
          status: input.expectedQuoteStatus
        },
        data: {
          status: input.targetQuoteStatus
        }
      });

      if (quoteUpdateResult.count === 0) {
        throw new OptimisticPublicQuoteDecisionConflictError();
      }

      const serviceOrderUpdateResult = await transaction.serviceOrder.updateMany({
        where: {
          id: input.serviceOrderId,
          organizationId: input.organizationId,
          status: input.expectedServiceOrderStatus
        },
        data: {
          status: input.targetServiceOrderStatus
        }
      });

      if (serviceOrderUpdateResult.count === 0) {
        throw new OptimisticPublicQuoteDecisionConflictError();
      }

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: input.organizationId,
          serviceOrderId: input.serviceOrderId,
          type: input.quoteTimeline.type,
          description: input.quoteTimeline.description
        }
      });

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: input.organizationId,
          serviceOrderId: input.serviceOrderId,
          type: input.serviceOrderTimeline.type,
          description: input.serviceOrderTimeline.description
        }
      });
    });

    return true;
  } catch (error) {
    if (error instanceof OptimisticPublicQuoteDecisionConflictError) {
      return false;
    }

    throw error;
  }
}
