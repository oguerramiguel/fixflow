import {
  EquipmentType,
  Prisma,
  ServiceOrderStatus as PrismaServiceOrderStatus,
  UserRole
} from "@prisma/client";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { ServiceOrderCreateInput } from "@/domain/services/service-order-validation";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { PublicCodeCollisionError } from "@/server/repositories/service-order-repository";
import {
  createServiceOrder,
  getServiceOrderDetails,
  listServiceOrdersForOrganization,
  SERVICE_ORDER_PUBLIC_CODE_MAX_ATTEMPTS,
  transitionServiceOrderStatus,
  type ServiceOrderServiceDependencies
} from "@/server/services/service-order-service";

const context: AuthenticatedContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: UserRole.OWNER
};

const now = new Date("2026-07-10T00:00:00.000Z");

const equipmentRecord = {
  id: "equipment-1",
  customerId: "customer-1",
  type: EquipmentType.NOTEBOOK,
  brand: "Dell",
  model: "Latitude",
  serialNumber: null,
  accessories: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
  customer: {
    id: "customer-1",
    name: "Maria",
    email: null,
    phone: "11999999999"
  }
};

const serviceOrderRecord = {
  id: "service-order-1",
  publicCode: "FF-ABCDEFG234",
  reportedIssue: "Tela apagando.",
  status: PrismaServiceOrderStatus.RECEIVED,
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
  }
};

const serviceOrderDetailsRecord = {
  ...serviceOrderRecord,
  diagnostic: null,
  quote: null,
  timeline: [
    {
      id: "timeline-1",
      type: "SERVICE_ORDER_CREATED",
      description: "Ordem de servico aberta com status Recebido.",
      createdAt: now
    }
  ]
};

function createDependencies(
  overrides: Partial<ServiceOrderServiceDependencies> = {}
): ServiceOrderServiceDependencies {
  return {
    findEquipmentById: vi.fn(async () => equipmentRecord),
    listServiceOrders: vi.fn(async () => []),
    countServiceOrders: vi.fn(async () => 0),
    findServiceOrderById: vi.fn(async () => serviceOrderDetailsRecord),
    createServiceOrderWithInitialTimeline: vi.fn(async () => serviceOrderRecord),
    transitionServiceOrderStatus: vi.fn(async () => ({
      ...serviceOrderRecord,
      status: PrismaServiceOrderStatus.IN_DIAGNOSIS
    })),
    createPublicCode: vi.fn(() => "FF-ABCDEFG234"),
    ...overrides
  };
}

const validCreateInput: ServiceOrderCreateInput = {
  equipmentId: "equipment-1",
  reportedIssue: "  Tela apagando.  "
};

describe("service order service", () => {
  it("lists service orders with normalized query and validated status", async () => {
    const dependencies = createDependencies();

    await listServiceOrdersForOrganization(
      context,
      {
        page: 0,
        query: "  dell  ",
        status: "RECEIVED"
      },
      dependencies
    );

    expect(dependencies.listServiceOrders).toHaveBeenCalledWith(context, {
      page: 1,
      query: "dell",
      status: "RECEIVED"
    });
    expect(dependencies.countServiceOrders).toHaveBeenCalledWith(context, {
      query: "dell",
      status: "RECEIVED"
    });
  });

  it("rejects invalid status filters before calling the repository", async () => {
    const dependencies = createDependencies();

    await expect(
      listServiceOrdersForOrganization(
        context,
        {
          status: "INVALID"
        },
        dependencies
      )
    ).rejects.toThrow(ValidationError);

    expect(dependencies.listServiceOrders).not.toHaveBeenCalled();
  });

  it("gets service order details by tenant-aware repository", async () => {
    const dependencies = createDependencies();

    const result = await getServiceOrderDetails(
      context,
      "service-order-1",
      dependencies
    );

    expect(dependencies.findServiceOrderById).toHaveBeenCalledWith(
      context,
      "service-order-1"
    );
    expect(result.timeline).toHaveLength(1);
    expect(result).not.toHaveProperty("organizationId");
  });

  it("returns NotFound for missing service order details", async () => {
    await expect(
      getServiceOrderDetails(
        context,
        "cross-tenant-service-order",
        createDependencies({
          findServiceOrderById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("creates a service order deriving customerId from tenant-scoped equipment", async () => {
    const dependencies = createDependencies();

    const result = await createServiceOrder(
      context,
      validCreateInput,
      dependencies
    );

    expect(dependencies.findEquipmentById).toHaveBeenCalledWith(
      context,
      "equipment-1"
    );
    expect(dependencies.createPublicCode).toHaveBeenCalledTimes(1);
    expect(dependencies.createServiceOrderWithInitialTimeline).toHaveBeenCalledWith(
      context,
      {
        customerId: "customer-1",
        equipmentId: "equipment-1",
        publicCode: "FF-ABCDEFG234",
        reportedIssue: "Tela apagando.",
        initialTimeline: {
          type: "SERVICE_ORDER_CREATED",
          description: "Ordem de servico aberta com status Recebido."
        }
      }
    );
    expect(result.status).toBe("RECEIVED");
  });

  it("rejects invalid reportedIssue", async () => {
    await expect(
      createServiceOrder(
        context,
        {
          equipmentId: "equipment-1",
          reportedIssue: ""
        },
        createDependencies()
      )
    ).rejects.toThrow(ValidationError);
  });

  it("treats missing or cross-tenant equipment as NotFound", async () => {
    await expect(
      createServiceOrder(
        context,
        {
          equipmentId: "equipment-from-other-tenant",
          reportedIssue: "Tela apagando."
        },
        createDependencies({
          findEquipmentById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("retries publicCode collision and succeeds with a new code", async () => {
    const dependencies = createDependencies({
      createPublicCode: vi
        .fn()
        .mockReturnValueOnce("FF-COLLISION1")
        .mockReturnValueOnce("FF-UNIQUE0001"),
      createServiceOrderWithInitialTimeline: vi
        .fn()
        .mockRejectedValueOnce(new PublicCodeCollisionError())
        .mockResolvedValueOnce({
          ...serviceOrderRecord,
          publicCode: "FF-UNIQUE0001"
        })
    });

    const result = await createServiceOrder(
      context,
      validCreateInput,
      dependencies
    );

    expect(dependencies.createPublicCode).toHaveBeenCalledTimes(2);
    expect(dependencies.createServiceOrderWithInitialTimeline).toHaveBeenCalledTimes(
      2
    );
    expect(result.publicCode).toBe("FF-UNIQUE0001");
  });

  it("limits publicCode collision attempts", async () => {
    const dependencies = createDependencies({
      createServiceOrderWithInitialTimeline: vi.fn(async () => {
        throw new PublicCodeCollisionError();
      })
    });

    await expect(
      createServiceOrder(context, validCreateInput, dependencies)
    ).rejects.toThrow(DomainError);

    expect(dependencies.createPublicCode).toHaveBeenCalledTimes(
      SERVICE_ORDER_PUBLIC_CODE_MAX_ATTEMPTS
    );
    expect(dependencies.createServiceOrderWithInitialTimeline).toHaveBeenCalledTimes(
      SERVICE_ORDER_PUBLIC_CODE_MAX_ATTEMPTS
    );
  });

  it("does not hide non-publicCode database errors", async () => {
    const error = new Error("database is unavailable");

    await expect(
      createServiceOrder(
        context,
        validCreateInput,
        createDependencies({
          createServiceOrderWithInitialTimeline: vi.fn(async () => {
            throw error;
          })
        })
      )
    ).rejects.toBe(error);
  });

  it("uses the persisted current status for a valid transition", async () => {
    const dependencies = createDependencies();

    await transitionServiceOrderStatus(
      context,
      "service-order-1",
      "IN_DIAGNOSIS",
      dependencies
    );

    expect(dependencies.findServiceOrderById).toHaveBeenCalledWith(
      context,
      "service-order-1"
    );
    expect(dependencies.transitionServiceOrderStatus).toHaveBeenCalledWith(
      context,
      {
        serviceOrderId: "service-order-1",
        currentStatus: "RECEIVED",
        targetStatus: "IN_DIAGNOSIS",
        timeline: {
          type: "STATUS_CHANGED",
          description: "Status alterado de Recebido para Em diagnostico."
        }
      }
    );
  });

  it("blocks generic transition from diagnosis to waiting for approval", async () => {
    await expect(
      transitionServiceOrderStatus(
        context,
        "service-order-1",
        "WAITING_FOR_APPROVAL",
        createDependencies({
          findServiceOrderById: vi.fn(async () => ({
            ...serviceOrderDetailsRecord,
            status: PrismaServiceOrderStatus.IN_DIAGNOSIS
          }))
        })
      )
    ).rejects.toThrow(
      "Envie o orcamento para colocar a ordem em espera de aprovacao."
    );
  });

  it("blocks generic transition from waiting for approval to approved", async () => {
    await expect(
      transitionServiceOrderStatus(
        context,
        "service-order-1",
        "APPROVED",
        createDependencies({
          findServiceOrderById: vi.fn(async () => ({
            ...serviceOrderDetailsRecord,
            status: PrismaServiceOrderStatus.WAITING_FOR_APPROVAL
          }))
        })
      )
    ).rejects.toThrow(
      "Registre a aprovacao do orcamento para aprovar a ordem de servico."
    );
  });

  it("rejects invalid targetStatus before loading the service order", async () => {
    const dependencies = createDependencies();

    await expect(
      transitionServiceOrderStatus(
        context,
        "service-order-1",
        "INVALID",
        dependencies
      )
    ).rejects.toThrow(ValidationError);

    expect(dependencies.findServiceOrderById).not.toHaveBeenCalled();
  });

  it("rejects invalid workflow transitions", async () => {
    await expect(
      transitionServiceOrderStatus(
        context,
        "service-order-1",
        "COMPLETED",
        createDependencies()
      )
    ).rejects.toThrow(DomainError);
  });

  it("returns NotFound when transitioning a missing or cross-tenant order", async () => {
    await expect(
      transitionServiceOrderStatus(
        context,
        "cross-tenant-service-order",
        "IN_DIAGNOSIS",
        createDependencies({
          findServiceOrderById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("returns NotFound when cancelling a cross-tenant order", async () => {
    const dependencies = createDependencies({
      findServiceOrderById: vi.fn(async () => null)
    });

    await expect(
      transitionServiceOrderStatus(
        context,
        "cross-tenant-service-order",
        "CANCELLED",
        dependencies
      )
    ).rejects.toThrow(NotFoundError);

    expect(dependencies.transitionServiceOrderStatus).not.toHaveBeenCalled();
  });

  it("raises ConflictError when optimistic transition update affects no rows", async () => {
    await expect(
      transitionServiceOrderStatus(
        context,
        "service-order-1",
        "IN_DIAGNOSIS",
        createDependencies({
          transitionServiceOrderStatus: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(ConflictError);
  });

  it("allows owner and admin to cancel when the workflow allows it", async () => {
    for (const role of [UserRole.OWNER, UserRole.ADMIN]) {
      const dependencies = createDependencies({
        transitionServiceOrderStatus: vi.fn(async () => ({
          ...serviceOrderRecord,
          status: PrismaServiceOrderStatus.CANCELLED
        }))
      });

      await expect(
        transitionServiceOrderStatus(
          {
            ...context,
            role
          },
          "service-order-1",
          "CANCELLED",
          dependencies
        )
      ).resolves.toMatchObject({
        status: "CANCELLED"
      });
    }
  });

  it("rejects technician cancellation at the service layer", async () => {
    const dependencies = createDependencies();

    await expect(
      transitionServiceOrderStatus(
        {
          ...context,
          role: UserRole.TECHNICIAN
        },
        "service-order-1",
        "CANCELLED",
        dependencies
      )
    ).rejects.toThrow(AuthorizationError);

    expect(dependencies.transitionServiceOrderStatus).not.toHaveBeenCalled();
  });

  it("allows technician operational transitions", async () => {
    await expect(
      transitionServiceOrderStatus(
        {
          ...context,
          role: UserRole.TECHNICIAN
        },
        "service-order-1",
        "IN_DIAGNOSIS",
        createDependencies()
      )
    ).resolves.toMatchObject({
      status: "IN_DIAGNOSIS"
    });
  });

  it("maps diagnostic and quote summaries without exposing organizationId", async () => {
    const dependencies = createDependencies({
      findServiceOrderById: vi.fn(async () => ({
        ...serviceOrderDetailsRecord,
        status: PrismaServiceOrderStatus.IN_DIAGNOSIS,
        diagnostic: {
          id: "diagnostic-1",
          description: "Fonte em curto na placa principal.",
          updatedAt: now
        },
        quote: {
          id: "quote-1",
          status: "DRAFT" as const,
          createdAt: now,
          updatedAt: now,
          items: [
            {
              id: "item-1",
              quantity: 2,
              unitPrice: new Prisma.Decimal("10.50")
            }
          ]
        }
      }))
    });

    const result = await getServiceOrderDetails(
      context,
      "service-order-1",
      dependencies
    );

    expect(result.diagnostic?.description).toBe(
      "Fonte em curto na placa principal."
    );
    expect(result.quote).toMatchObject({
      status: "DRAFT",
      itemCount: 1,
      total: "21.00"
    });
    expect(result).not.toHaveProperty("organizationId");
  });

  it("does not expose forbidden fields in create input", () => {
    expectTypeOf<ServiceOrderCreateInput>().not.toHaveProperty("organizationId");
    expectTypeOf<ServiceOrderCreateInput>().not.toHaveProperty("customerId");
    expectTypeOf<ServiceOrderCreateInput>().not.toHaveProperty("status");
    expectTypeOf<ServiceOrderCreateInput>().not.toHaveProperty("publicCode");
  });
});
