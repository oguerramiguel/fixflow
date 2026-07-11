import {
  EquipmentType,
  Prisma,
  QuoteStatus as PrismaQuoteStatus,
  ServiceOrderStatus,
  UserRole
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { QuoteAlreadyExistsError } from "@/server/repositories/quote-repository";
import type { DiagnosticRecord } from "@/server/repositories/diagnostic-repository";
import type {
  QuoteDetailsRecord,
  QuoteItemRecord
} from "@/server/repositories/quote-repository";
import type { ServiceOrderDetailsRecord } from "@/server/repositories/service-order-repository";
import {
  addQuoteItem,
  approveQuote,
  createQuoteForServiceOrder,
  rejectQuote,
  removeQuoteItem,
  sendQuote,
  updateQuoteItem,
  type QuoteServiceDependencies
} from "@/server/services/quote-service";

const now = new Date("2026-07-10T00:00:00.000Z");

const ownerContext: AuthenticatedContext = {
  userId: "owner-1",
  organizationId: "org-1",
  role: UserRole.OWNER
};

const adminContext: AuthenticatedContext = {
  ...ownerContext,
  role: UserRole.ADMIN
};

const technicianContext: AuthenticatedContext = {
  ...ownerContext,
  role: UserRole.TECHNICIAN
};

const serviceOrderRecord: ServiceOrderDetailsRecord = {
  id: "service-order-1",
  publicCode: "FF-ABCDEFG234",
  reportedIssue: "Tela apagando.",
  status: ServiceOrderStatus.IN_DIAGNOSIS,
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
    type: EquipmentType.NOTEBOOK,
    brand: "Dell",
    model: "Latitude",
    serialNumber: null
  },
  diagnostic: {
    id: "diagnostic-1",
    description: "Placa principal com curto no setor de entrada.",
    updatedAt: now
  },
  quote: null,
  timeline: []
};

const diagnosticRecord: DiagnosticRecord = {
  id: "diagnostic-1",
  serviceOrderId: "service-order-1",
  description: "Placa principal com curto no setor de entrada.",
  technicalNotes: null,
  createdAt: now,
  updatedAt: now
};

const quoteItemRecord: QuoteItemRecord = {
  id: "item-1",
  quoteId: "quote-1",
  description: "Limpeza interna",
  quantity: 2,
  unitPrice: new Prisma.Decimal("100.00"),
  createdAt: now,
  updatedAt: now
};

const draftQuoteRecord: QuoteDetailsRecord = {
  id: "quote-1",
  serviceOrderId: "service-order-1",
  status: PrismaQuoteStatus.DRAFT,
  createdAt: now,
  updatedAt: now,
  items: [quoteItemRecord]
};

const sentQuoteRecord: QuoteDetailsRecord = {
  ...draftQuoteRecord,
  status: PrismaQuoteStatus.SENT
};

function createDependencies(
  overrides: Partial<QuoteServiceDependencies> = {}
): QuoteServiceDependencies {
  return {
    findServiceOrderById: vi.fn(async () => serviceOrderRecord),
    findDiagnosticByServiceOrder: vi.fn(async () => diagnosticRecord),
    findQuoteByServiceOrder: vi.fn(async () => draftQuoteRecord),
    createDraftQuoteWithTimeline: vi.fn(async () => ({
      ...draftQuoteRecord,
      items: []
    })),
    addQuoteItem: vi.fn(async () => quoteItemRecord),
    updateQuoteItem: vi.fn(async () => quoteItemRecord),
    removeQuoteItem: vi.fn(async () => true),
    transitionQuoteWithServiceOrder: vi.fn(async (_context, input) => ({
      ...draftQuoteRecord,
      status: input.targetQuoteStatus
    })),
    ...overrides
  };
}

describe("quote service", () => {
  it("creates DRAFT quote only with diagnostic and service order in diagnosis", async () => {
    const dependencies = createDependencies({
      findQuoteByServiceOrder: vi.fn(async () => null)
    });

    const result = await createQuoteForServiceOrder(
      ownerContext,
      "service-order-1",
      dependencies
    );

    expect(dependencies.createDraftQuoteWithTimeline).toHaveBeenCalledWith(
      ownerContext,
      {
        serviceOrderId: "service-order-1",
        timeline: {
          type: "QUOTE_CREATED",
          description: "Orcamento criado em rascunho."
        }
      }
    );
    expect(result.status).toBe("DRAFT");
  });

  it("does not create duplicate quote when one already exists", async () => {
    const dependencies = createDependencies();

    const result = await createQuoteForServiceOrder(
      ownerContext,
      "service-order-1",
      dependencies
    );

    expect(result.id).toBe("quote-1");
    expect(dependencies.createDraftQuoteWithTimeline).not.toHaveBeenCalled();
  });

  it("reloads existing quote after unique conflict during creation", async () => {
    const dependencies = createDependencies({
      findQuoteByServiceOrder: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(draftQuoteRecord),
      createDraftQuoteWithTimeline: vi.fn(async () => {
        throw new QuoteAlreadyExistsError();
      })
    });

    const result = await createQuoteForServiceOrder(
      ownerContext,
      "service-order-1",
      dependencies
    );

    expect(result.id).toBe("quote-1");
  });

  it("rejects quote creation without diagnostic or valid service order status", async () => {
    await expect(
      createQuoteForServiceOrder(
        ownerContext,
        "service-order-1",
        createDependencies({
          findDiagnosticByServiceOrder: vi.fn(async () => null),
          findQuoteByServiceOrder: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(DomainError);

    await expect(
      createQuoteForServiceOrder(
        ownerContext,
        "service-order-1",
        createDependencies({
          findServiceOrderById: vi.fn(async () => ({
            ...serviceOrderRecord,
            status: ServiceOrderStatus.RECEIVED
          }))
        })
      )
    ).rejects.toThrow(DomainError);
  });

  it("treats cross-tenant service order as NotFound", async () => {
    await expect(
      createQuoteForServiceOrder(
        ownerContext,
        "cross-tenant-service-order",
        createDependencies({
          findServiceOrderById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("adds quote item only while quote is DRAFT and validates resulting total", async () => {
    const dependencies = createDependencies({
      findQuoteByServiceOrder: vi
        .fn()
        .mockResolvedValueOnce(draftQuoteRecord)
        .mockResolvedValueOnce({
          ...draftQuoteRecord,
          items: [
            ...draftQuoteRecord.items,
            {
              ...quoteItemRecord,
              id: "item-2",
              description: "Teclado",
              quantity: 1,
              unitPrice: new Prisma.Decimal("350.00")
            }
          ]
        })
    });

    const result = await addQuoteItem(
      technicianContext,
      "service-order-1",
      {
        description: "Teclado",
        quantity: "1",
        unitPrice: "350,00"
      },
      dependencies
    );

    expect(dependencies.addQuoteItem).toHaveBeenCalledWith(
      technicianContext,
      "quote-1",
      expect.objectContaining({
        description: "Teclado",
        quantity: 1
      })
    );
    expect(result.total).toBe("550.00");
  });

  it("rejects item mutation outside DRAFT", async () => {
    await expect(
      addQuoteItem(
        technicianContext,
        "service-order-1",
        {
          description: "Teclado",
          quantity: "1",
          unitPrice: "350,00"
        },
        createDependencies({
          findQuoteByServiceOrder: vi.fn(async () => sentQuoteRecord)
        })
      )
    ).rejects.toThrow(DomainError);
  });

  it("updates item without accepting quoteId or organizationId from input", async () => {
    const dependencies = createDependencies();

    await updateQuoteItem(
      technicianContext,
      "service-order-1",
      "item-1",
      {
        description: "Limpeza completa",
        quantity: "2",
        unitPrice: "120.00"
      },
      dependencies
    );

    expect(dependencies.updateQuoteItem).toHaveBeenCalledWith(
      technicianContext,
      "quote-1",
      "item-1",
      expect.not.objectContaining({
        quoteId: expect.any(String),
        organizationId: expect.any(String)
      })
    );
  });

  it("removes item only when it belongs to the tenant-scoped quote", async () => {
    const dependencies = createDependencies();

    await removeQuoteItem(
      technicianContext,
      "service-order-1",
      "item-1",
      dependencies
    );

    expect(dependencies.removeQuoteItem).toHaveBeenCalledWith(
      technicianContext,
      "quote-1",
      "item-1"
    );
  });

  it("rejects invalid quote item input before repository write", async () => {
    const dependencies = createDependencies();

    await expect(
      addQuoteItem(
        technicianContext,
        "service-order-1",
        {
          description: "A",
          quantity: "2abc",
          unitPrice: "10.999"
        },
        dependencies
      )
    ).rejects.toThrow(ValidationError);

    expect(dependencies.addQuoteItem).not.toHaveBeenCalled();
  });

  it("allows owner and admin to send quote but rejects technician", async () => {
    for (const context of [ownerContext, adminContext]) {
      await expect(
        sendQuote(context, "service-order-1", createDependencies())
      ).resolves.toMatchObject({
        status: "SENT"
      });
    }

    await expect(
      sendQuote(technicianContext, "service-order-1", createDependencies())
    ).rejects.toThrow(AuthorizationError);
  });

  it("sends quote with optimistic quote and service order statuses", async () => {
    const dependencies = createDependencies();

    await sendQuote(ownerContext, "service-order-1", dependencies);

    expect(dependencies.transitionQuoteWithServiceOrder).toHaveBeenCalledWith(
      ownerContext,
      expect.objectContaining({
        expectedQuoteStatus: "DRAFT",
        targetQuoteStatus: "SENT",
        expectedServiceOrderStatus: "IN_DIAGNOSIS",
        targetServiceOrderStatus: "WAITING_FOR_APPROVAL",
        quoteTimeline: {
          type: "QUOTE_SENT",
          description: "Orcamento marcado como enviado."
        }
      })
    );
  });

  it("rejects sending empty or zero-total quote", async () => {
    await expect(
      sendQuote(
        ownerContext,
        "service-order-1",
        createDependencies({
          findQuoteByServiceOrder: vi.fn(async () => ({
            ...draftQuoteRecord,
            items: []
          }))
        })
      )
    ).rejects.toThrow(DomainError);

    await expect(
      sendQuote(
        ownerContext,
        "service-order-1",
        createDependencies({
          findQuoteByServiceOrder: vi.fn(async () => ({
            ...draftQuoteRecord,
            items: [
              {
                ...quoteItemRecord,
                unitPrice: new Prisma.Decimal("0.00")
              }
            ]
          }))
        })
      )
    ).rejects.toThrow(DomainError);
  });

  it("returns ConflictError when quote transition repository reports conflict", async () => {
    await expect(
      sendQuote(
        ownerContext,
        "service-order-1",
        createDependencies({
          transitionQuoteWithServiceOrder: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(ConflictError);
  });

  it("approves and rejects sent quote through commercial roles only", async () => {
    const waitingServiceOrder = {
      ...serviceOrderRecord,
      status: ServiceOrderStatus.WAITING_FOR_APPROVAL
    };

    await expect(
      approveQuote(
        ownerContext,
        "service-order-1",
        createDependencies({
          findServiceOrderById: vi.fn(async () => waitingServiceOrder),
          findQuoteByServiceOrder: vi.fn(async () => sentQuoteRecord)
        })
      )
    ).resolves.toMatchObject({
      status: "APPROVED"
    });

    await expect(
      rejectQuote(
        adminContext,
        "service-order-1",
        createDependencies({
          findServiceOrderById: vi.fn(async () => waitingServiceOrder),
          findQuoteByServiceOrder: vi.fn(async () => sentQuoteRecord)
        })
      )
    ).resolves.toMatchObject({
      status: "REJECTED"
    });

    await expect(
      approveQuote(
        technicianContext,
        "service-order-1",
        createDependencies({
          findServiceOrderById: vi.fn(async () => waitingServiceOrder),
          findQuoteByServiceOrder: vi.fn(async () => sentQuoteRecord)
        })
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("uses specialized approval and rejection service order transitions", async () => {
    const waitingServiceOrder = {
      ...serviceOrderRecord,
      status: ServiceOrderStatus.WAITING_FOR_APPROVAL
    };
    const approveDependencies = createDependencies({
      findServiceOrderById: vi.fn(async () => waitingServiceOrder),
      findQuoteByServiceOrder: vi.fn(async () => sentQuoteRecord)
    });

    await approveQuote(ownerContext, "service-order-1", approveDependencies);

    expect(approveDependencies.transitionQuoteWithServiceOrder).toHaveBeenCalledWith(
      ownerContext,
      expect.objectContaining({
        expectedQuoteStatus: "SENT",
        targetQuoteStatus: "APPROVED",
        expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
        targetServiceOrderStatus: "APPROVED"
      })
    );

    const rejectDependencies = createDependencies({
      findServiceOrderById: vi.fn(async () => waitingServiceOrder),
      findQuoteByServiceOrder: vi.fn(async () => sentQuoteRecord)
    });

    await rejectQuote(ownerContext, "service-order-1", rejectDependencies);

    expect(rejectDependencies.transitionQuoteWithServiceOrder).toHaveBeenCalledWith(
      ownerContext,
      expect.objectContaining({
        expectedQuoteStatus: "SENT",
        targetQuoteStatus: "REJECTED",
        expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
        targetServiceOrderStatus: "CANCELLED"
      })
    );
  });
});
