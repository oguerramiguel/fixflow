import { QuoteStatus, ServiceOrderStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serviceOrder: {
    findUnique: vi.fn(),
    updateMany: vi.fn()
  },
  quote: {
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
    quote: mocks.quote,
    serviceOrderTimeline: mocks.serviceOrderTimeline,
    $transaction: mocks.transaction
  }
}));

import {
  findPublicServiceOrderByPublicCode,
  findPublicServiceOrderDecisionByPublicCode,
  transitionPublicQuoteDecision
} from "@/server/repositories/public-service-order-repository";

describe("public service order repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceOrder: mocks.serviceOrder,
        quote: mocks.quote,
        serviceOrderTimeline: mocks.serviceOrderTimeline
      })
    );
  });

  it("loads public tracking details by publicCode with a minimized select", async () => {
    mocks.serviceOrder.findUnique.mockResolvedValueOnce(null);

    await findPublicServiceOrderByPublicCode("FF-ABCDEFG234");

    expect(mocks.serviceOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicCode: "FF-ABCDEFG234"
        }
      })
    );

    const select = mocks.serviceOrder.findUnique.mock.calls[0][0].select;

    expect(select).not.toHaveProperty("id");
    expect(select).not.toHaveProperty("organizationId");
    expect(select).not.toHaveProperty("customer");
    expect(select.equipment.select).not.toHaveProperty("id");
    expect(select.equipment.select).not.toHaveProperty("customerId");
    expect(select.equipment.select).not.toHaveProperty("serialNumber");
    expect(select.quote.select).not.toHaveProperty("id");
    expect(select.quote.select.items.select).not.toHaveProperty("id");
    expect(select.quote.select.items.select).not.toHaveProperty("quoteId");
    expect(select.timeline.select).not.toHaveProperty("id");
    expect(select.timeline.select).not.toHaveProperty("description");
  });

  it("loads decision resources by publicCode without customer data", async () => {
    mocks.serviceOrder.findUnique.mockResolvedValueOnce(null);

    await findPublicServiceOrderDecisionByPublicCode("FF-ABCDEFG234");

    const call = mocks.serviceOrder.findUnique.mock.calls[0][0];

    expect(call.where).toEqual({
      publicCode: "FF-ABCDEFG234"
    });
    expect(call.select).toEqual({
      id: true,
      organizationId: true,
      status: true,
      quote: {
        select: {
          id: true,
          status: true
        }
      }
    });
  });

  it("updates quote, service order and timelines in one public transaction", async () => {
    mocks.quote.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrder.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrderTimeline.create.mockResolvedValue({
      id: "timeline-1"
    });

    const result = await transitionPublicQuoteDecision({
      serviceOrderId: "service-order-1",
      organizationId: "org-1",
      quoteId: "quote-1",
      expectedQuoteStatus: "SENT",
      targetQuoteStatus: "APPROVED",
      expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
      targetServiceOrderStatus: "APPROVED",
      quoteTimeline: {
        type: "QUOTE_APPROVED",
        description: "Orcamento aprovado pelo portal publico."
      },
      serviceOrderTimeline: {
        type: "STATUS_CHANGED",
        description: "Status alterado de Aguardando aprovacao para Aprovado."
      }
    });

    expect(result).toBe(true);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.quote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "quote-1",
        organizationId: "org-1",
        status: QuoteStatus.SENT
      },
      data: {
        status: QuoteStatus.APPROVED
      }
    });
    expect(mocks.serviceOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: "service-order-1",
        organizationId: "org-1",
        status: ServiceOrderStatus.WAITING_FOR_APPROVAL
      },
      data: {
        status: ServiceOrderStatus.APPROVED
      }
    });
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledTimes(2);
  });

  it("does not create timeline when public quote optimistic update conflicts", async () => {
    mocks.quote.updateMany.mockResolvedValueOnce({
      count: 0
    });

    const result = await transitionPublicQuoteDecision({
      serviceOrderId: "service-order-1",
      organizationId: "org-1",
      quoteId: "quote-1",
      expectedQuoteStatus: "SENT",
      targetQuoteStatus: "APPROVED",
      expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
      targetServiceOrderStatus: "APPROVED",
      quoteTimeline: {
        type: "QUOTE_APPROVED",
        description: "Orcamento aprovado pelo portal publico."
      },
      serviceOrderTimeline: {
        type: "STATUS_CHANGED",
        description: "Status alterado de Aguardando aprovacao para Aprovado."
      }
    });

    expect(result).toBe(false);
    expect(mocks.serviceOrder.updateMany).not.toHaveBeenCalled();
    expect(mocks.serviceOrderTimeline.create).not.toHaveBeenCalled();
  });

  it("does not create timeline when public service order optimistic update conflicts", async () => {
    mocks.quote.updateMany.mockResolvedValueOnce({
      count: 1
    });
    mocks.serviceOrder.updateMany.mockResolvedValueOnce({
      count: 0
    });

    const result = await transitionPublicQuoteDecision({
      serviceOrderId: "service-order-1",
      organizationId: "org-1",
      quoteId: "quote-1",
      expectedQuoteStatus: "SENT",
      targetQuoteStatus: "REJECTED",
      expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
      targetServiceOrderStatus: "CANCELLED",
      quoteTimeline: {
        type: "QUOTE_REJECTED",
        description: "Orcamento rejeitado pelo portal publico."
      },
      serviceOrderTimeline: {
        type: "STATUS_CHANGED",
        description: "Status alterado de Aguardando aprovacao para Cancelado."
      }
    });

    expect(result).toBe(false);
    expect(mocks.serviceOrderTimeline.create).not.toHaveBeenCalled();
  });
});
