import {
  EquipmentType,
  Prisma,
  QuoteStatus,
  ServiceOrderStatus
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import type {
  PublicServiceOrderDecisionRecord,
  PublicServiceOrderRecord
} from "@/server/repositories/public-service-order-repository";
import {
  approvePublicQuote,
  getPublicServiceOrderByCode,
  rejectPublicQuote,
  type PublicTrackingServiceDependencies
} from "@/server/services/public-tracking-service";

const now = new Date("2026-07-10T00:00:00.000Z");

const publicServiceOrderRecord: PublicServiceOrderRecord = {
  publicCode: "FF-ABCDEFG234",
  reportedIssue: "Tela apagando durante o uso.",
  status: ServiceOrderStatus.WAITING_FOR_APPROVAL,
  createdAt: now,
  updatedAt: now,
  equipment: {
    type: EquipmentType.NOTEBOOK,
    brand: "Dell",
    model: "Latitude"
  },
  quote: {
    status: QuoteStatus.SENT,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        description: "Limpeza interna",
        quantity: 2,
        unitPrice: new Prisma.Decimal("100.00")
      }
    ]
  },
  timeline: [
    {
      type: "SERVICE_ORDER_CREATED",
      createdAt: now
    },
    {
      type: "QUOTE_CREATED",
      createdAt: now
    },
    {
      type: "QUOTE_SENT",
      createdAt: now
    },
    {
      type: "DIAGNOSTIC_RECORDED",
      createdAt: now
    }
  ]
};

const decisionRecord: PublicServiceOrderDecisionRecord = {
  id: "service-order-1",
  organizationId: "org-1",
  status: ServiceOrderStatus.WAITING_FOR_APPROVAL,
  quote: {
    id: "quote-1",
    status: QuoteStatus.SENT
  }
};

function createDependencies(
  overrides: Partial<PublicTrackingServiceDependencies> = {}
): PublicTrackingServiceDependencies {
  return {
    findPublicServiceOrderByPublicCode: vi.fn(
      async () => publicServiceOrderRecord
    ),
    findPublicServiceOrderDecisionByPublicCode: vi.fn(
      async () => decisionRecord
    ),
    transitionPublicQuoteDecision: vi.fn(async () => true),
    ...overrides
  };
}

describe("public tracking service", () => {
  it("normalizes publicCode before querying public details", async () => {
    const dependencies = createDependencies();

    await getPublicServiceOrderByCode("  ff-abcdefg234  ", dependencies);

    expect(dependencies.findPublicServiceOrderByPublicCode).toHaveBeenCalledWith(
      "FF-ABCDEFG234"
    );
  });

  it("rejects invalid publicCode before querying public details", async () => {
    const dependencies = createDependencies();

    await expect(
      getPublicServiceOrderByCode("service-order-1", dependencies)
    ).rejects.toThrow(NotFoundError);

    expect(dependencies.findPublicServiceOrderByPublicCode).not.toHaveBeenCalled();
  });

  it("returns a minimized DTO without tenant, customer, ids or technical notes", async () => {
    const result = await getPublicServiceOrderByCode(
      "FF-ABCDEFG234",
      createDependencies()
    );
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      publicCode: "FF-ABCDEFG234",
      status: "WAITING_FOR_APPROVAL",
      statusLabel: "Aguardando aprovacao",
      equipment: {
        typeLabel: "Notebook",
        brand: "Dell",
        model: "Latitude"
      },
      quote: {
        status: "SENT",
        total: "200.00",
        canDecide: true
      }
    });
    expect(result.quote?.items[0]).toMatchObject({
      description: "Limpeza interna",
      quantity: 2,
      unitPrice: "100.00",
      subtotal: "200.00"
    });
    expect(serialized).not.toContain("organizationId");
    expect(serialized).not.toContain("customerId");
    expect(serialized).not.toContain("equipmentId");
    expect(serialized).not.toContain("service-order-1");
    expect(serialized).not.toContain("quote-1");
    expect(serialized).not.toContain("quoteItemId");
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("phone");
    expect(serialized).not.toContain("document");
    expect(serialized).not.toContain("technicalNotes");
    expect(serialized).not.toContain("serialNumber");
  });

  it("hides DRAFT quote and exposes public quote statuses read-only after decision", async () => {
    const draftResult = await getPublicServiceOrderByCode(
      "FF-ABCDEFG234",
      createDependencies({
        findPublicServiceOrderByPublicCode: vi.fn(async () => ({
          ...publicServiceOrderRecord,
          quote: {
            ...publicServiceOrderRecord.quote!,
            status: QuoteStatus.DRAFT
          }
        }))
      })
    );

    expect(draftResult.quote).toBeNull();

    for (const status of [QuoteStatus.APPROVED, QuoteStatus.REJECTED]) {
      const result = await getPublicServiceOrderByCode(
        "FF-ABCDEFG234",
        createDependencies({
          findPublicServiceOrderByPublicCode: vi.fn(async () => ({
            ...publicServiceOrderRecord,
            status:
              status === QuoteStatus.APPROVED
                ? ServiceOrderStatus.APPROVED
                : ServiceOrderStatus.CANCELLED,
            quote: {
              ...publicServiceOrderRecord.quote!,
              status
            }
          }))
        })
      );

      expect(result.quote?.status).toBe(status);
      expect(result.quote?.canDecide).toBe(false);
    }
  });

  it("maps public timeline messages and hides internal draft quote events", async () => {
    const result = await getPublicServiceOrderByCode(
      "FF-ABCDEFG234",
      createDependencies()
    );

    expect(result.timeline.map((event) => event.description)).toEqual([
      "Ordem de servico registrada.",
      "Orcamento disponibilizado para analise.",
      "Diagnostico tecnico registrado."
    ]);
  });

  it("approves public quote with expected statuses and public timeline", async () => {
    const dependencies = createDependencies();

    await approvePublicQuote("FF-ABCDEFG234", dependencies);

    expect(dependencies.transitionPublicQuoteDecision).toHaveBeenCalledWith({
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
  });

  it("rejects public quote with expected statuses and public timeline", async () => {
    const dependencies = createDependencies();

    await rejectPublicQuote("FF-ABCDEFG234", dependencies);

    expect(dependencies.transitionPublicQuoteDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        targetQuoteStatus: "REJECTED",
        targetServiceOrderStatus: "CANCELLED",
        quoteTimeline: {
          type: "QUOTE_REJECTED",
          description: "Orcamento rejeitado pelo portal publico."
        },
        serviceOrderTimeline: {
          type: "STATUS_CHANGED",
          description: "Status alterado de Aguardando aprovacao para Cancelado."
        }
      })
    );
  });

  it("blocks public decision when quote or service order is not decidable", async () => {
    const blockedRecords: PublicServiceOrderDecisionRecord[] = [
      {
        ...decisionRecord,
        quote: null
      },
      {
        ...decisionRecord,
        quote: {
          ...decisionRecord.quote!,
          status: QuoteStatus.DRAFT
        }
      },
      {
        ...decisionRecord,
        quote: {
          ...decisionRecord.quote!,
          status: QuoteStatus.APPROVED
        }
      },
      {
        ...decisionRecord,
        quote: {
          ...decisionRecord.quote!,
          status: QuoteStatus.REJECTED
        }
      },
      {
        ...decisionRecord,
        status: ServiceOrderStatus.IN_REPAIR
      }
    ];

    for (const record of blockedRecords) {
      const dependencies = createDependencies({
        findPublicServiceOrderDecisionByPublicCode: vi.fn(async () => record)
      });

      await expect(
        approvePublicQuote("FF-ABCDEFG234", dependencies)
      ).rejects.toThrow(DomainError);
      expect(dependencies.transitionPublicQuoteDecision).not.toHaveBeenCalled();
    }
  });

  it("returns NotFound for missing publicCode in decision flow", async () => {
    await expect(
      approvePublicQuote(
        "FF-ABCDEFG234",
        createDependencies({
          findPublicServiceOrderDecisionByPublicCode: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects invalid publicCode before loading decision resources", async () => {
    const dependencies = createDependencies();

    await expect(
      rejectPublicQuote("internal-service-order-id", dependencies)
    ).rejects.toThrow(NotFoundError);

    expect(
      dependencies.findPublicServiceOrderDecisionByPublicCode
    ).not.toHaveBeenCalled();
  });

  it("returns ConflictError when optimistic public decision update conflicts", async () => {
    await expect(
      approvePublicQuote(
        "FF-ABCDEFG234",
        createDependencies({
          transitionPublicQuoteDecision: vi.fn(async () => false)
        })
      )
    ).rejects.toThrow(ConflictError);
  });
});
