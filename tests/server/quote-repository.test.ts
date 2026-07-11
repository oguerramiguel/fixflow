import { Prisma, QuoteStatus, ServiceOrderStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  quote: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn()
  },
  quoteItem: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn()
  },
  serviceOrder: {
    updateMany: vi.fn()
  },
  serviceOrderTimeline: {
    create: vi.fn()
  },
  transaction: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    quote: mocks.quote,
    quoteItem: mocks.quoteItem,
    serviceOrder: mocks.serviceOrder,
    serviceOrderTimeline: mocks.serviceOrderTimeline,
    $transaction: mocks.transaction
  }
}));

import {
  addQuoteItem,
  createDraftQuoteWithTimeline,
  findQuoteByServiceOrder,
  QuoteAlreadyExistsError,
  removeQuoteItem,
  transitionQuoteWithServiceOrder,
  updateQuoteItem
} from "@/server/repositories/quote-repository";

const context: TenantContext = {
  organizationId: "org-1"
};

const now = new Date("2026-07-10T00:00:00.000Z");

const quoteRecord = {
  id: "quote-1",
  serviceOrderId: "service-order-1",
  status: QuoteStatus.DRAFT,
  createdAt: now,
  updatedAt: now,
  items: []
};

const quoteItemInput = {
  description: "Limpeza interna",
  quantity: 2,
  unitPrice: new Prisma.Decimal("100.00")
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

describe("quote repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        quote: mocks.quote,
        quoteItem: mocks.quoteItem,
        serviceOrder: mocks.serviceOrder,
        serviceOrderTimeline: mocks.serviceOrderTimeline
      })
    );
  });

  it("finds quote by serviceOrderId and organizationId", async () => {
    mocks.quote.findFirst.mockResolvedValueOnce(null);

    await findQuoteByServiceOrder(context, "service-order-1");

    expect(mocks.quote.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serviceOrderId: "service-order-1",
          organizationId: "org-1"
        }
      })
    );
  });

  it("creates DRAFT quote and timeline in one transaction", async () => {
    mocks.quote.create.mockResolvedValueOnce(quoteRecord);
    mocks.serviceOrderTimeline.create.mockResolvedValueOnce({
      id: "timeline-1"
    });

    await createDraftQuoteWithTimeline(context, {
      serviceOrderId: "service-order-1",
      timeline: {
        type: "QUOTE_CREATED",
        description: "Orcamento criado em rascunho."
      }
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: "org-1",
          serviceOrderId: "service-order-1",
          status: QuoteStatus.DRAFT
        }
      })
    );
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        serviceOrderId: "service-order-1",
        type: "QUOTE_CREATED",
        description: "Orcamento criado em rascunho."
      }
    });
  });

  it("wraps quote per service order unique conflicts", async () => {
    mocks.transaction.mockRejectedValueOnce(
      createPrismaKnownError(["serviceOrderId", "organizationId"])
    );

    await expect(
      createDraftQuoteWithTimeline(context, {
        serviceOrderId: "service-order-1",
        timeline: {
          type: "QUOTE_CREATED",
          description: "Orcamento criado em rascunho."
        }
      })
    ).rejects.toThrow(QuoteAlreadyExistsError);
  });

  it("creates, updates and removes quote items with tenant and quote filters", async () => {
    mocks.quoteItem.create.mockResolvedValueOnce({
      id: "item-1"
    });
    mocks.quoteItem.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.quoteItem.findFirst.mockResolvedValueOnce({
      id: "item-1"
    });
    mocks.quoteItem.deleteMany.mockResolvedValueOnce({
      count: 1
    });

    await addQuoteItem(context, "quote-1", quoteItemInput);
    await updateQuoteItem(context, "quote-1", "item-1", quoteItemInput);
    await removeQuoteItem(context, "quote-1", "item-1");

    expect(mocks.quoteItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          quoteId: "quote-1"
        })
      })
    );
    expect(mocks.quoteItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "item-1",
          quoteId: "quote-1",
          organizationId: "org-1"
        }
      })
    );
    expect(mocks.quoteItem.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        quoteId: "quote-1",
        organizationId: "org-1"
      }
    });
  });

  it("transitions quote and service order with optimistic filters and timelines", async () => {
    mocks.quote.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrder.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrderTimeline.create.mockResolvedValue({
      id: "timeline-1"
    });
    mocks.quote.findFirst.mockResolvedValueOnce({
      ...quoteRecord,
      status: QuoteStatus.SENT
    });

    await transitionQuoteWithServiceOrder(context, {
      quoteId: "quote-1",
      serviceOrderId: "service-order-1",
      expectedQuoteStatus: "DRAFT",
      targetQuoteStatus: "SENT",
      expectedServiceOrderStatus: "IN_DIAGNOSIS",
      targetServiceOrderStatus: "WAITING_FOR_APPROVAL",
      quoteTimeline: {
        type: "QUOTE_SENT",
        description: "Orcamento marcado como enviado."
      },
      serviceOrderTimeline: {
        type: "STATUS_CHANGED",
        description:
          "Status alterado de Em diagnostico para Aguardando aprovacao."
      }
    });

    expect(mocks.quote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "quote-1",
        organizationId: "org-1",
        status: "DRAFT"
      },
      data: {
        status: "SENT"
      }
    });
    expect(mocks.serviceOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: "service-order-1",
        organizationId: "org-1",
        status: ServiceOrderStatus.IN_DIAGNOSIS
      },
      data: {
        status: ServiceOrderStatus.WAITING_FOR_APPROVAL
      }
    });
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledTimes(2);
  });

  it("does not create timeline when optimistic quote update conflicts", async () => {
    mocks.quote.updateMany.mockResolvedValueOnce({
      count: 0
    });

    const result = await transitionQuoteWithServiceOrder(context, {
      quoteId: "quote-1",
      serviceOrderId: "service-order-1",
      expectedQuoteStatus: "DRAFT",
      targetQuoteStatus: "SENT",
      expectedServiceOrderStatus: "IN_DIAGNOSIS",
      targetServiceOrderStatus: "WAITING_FOR_APPROVAL",
      quoteTimeline: {
        type: "QUOTE_SENT",
        description: "Orcamento marcado como enviado."
      },
      serviceOrderTimeline: {
        type: "STATUS_CHANGED",
        description:
          "Status alterado de Em diagnostico para Aguardando aprovacao."
      }
    });

    expect(result).toBeNull();
    expect(mocks.serviceOrder.updateMany).not.toHaveBeenCalled();
    expect(mocks.serviceOrderTimeline.create).not.toHaveBeenCalled();
  });

  it("does not create timeline when optimistic service order update conflicts", async () => {
    mocks.quote.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrder.updateMany.mockResolvedValueOnce({
      count: 0
    });

    const result = await transitionQuoteWithServiceOrder(context, {
      quoteId: "quote-1",
      serviceOrderId: "service-order-1",
      expectedQuoteStatus: "SENT",
      targetQuoteStatus: "APPROVED",
      expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
      targetServiceOrderStatus: "APPROVED",
      quoteTimeline: {
        type: "QUOTE_APPROVED",
        description: "Aprovacao interna do orcamento registrada."
      },
      serviceOrderTimeline: {
        type: "STATUS_CHANGED",
        description: "Status alterado de Aguardando aprovacao para Aprovado."
      }
    });

    expect(result).toBeNull();
    expect(mocks.serviceOrderTimeline.create).not.toHaveBeenCalled();
  });
});
