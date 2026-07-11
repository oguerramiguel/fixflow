import { ServiceOrderStatus, UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import type { DiagnosticRecord } from "@/server/repositories/diagnostic-repository";
import type { ServiceOrderDetailsRecord } from "@/server/repositories/service-order-repository";
import {
  getDiagnosticForServiceOrder,
  saveDiagnosticForServiceOrder,
  type DiagnosticServiceDependencies
} from "@/server/services/diagnostic-service";

const now = new Date("2026-07-10T00:00:00.000Z");

const context: AuthenticatedContext = {
  userId: "user-1",
  organizationId: "org-1",
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
    type: "NOTEBOOK",
    brand: "Dell",
    model: "Latitude",
    serialNumber: null
  },
  diagnostic: null,
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

function createDependencies(
  overrides: Partial<DiagnosticServiceDependencies> = {}
): DiagnosticServiceDependencies {
  return {
    findServiceOrderById: vi.fn(async () => serviceOrderRecord),
    findDiagnosticByServiceOrder: vi.fn(async () => diagnosticRecord),
    saveDiagnosticWithTimeline: vi.fn(async () => ({
      diagnostic: diagnosticRecord,
      operation: "created" as const
    })),
    ...overrides
  };
}

describe("diagnostic service", () => {
  it("gets diagnostic through tenant-aware service order lookup", async () => {
    const dependencies = createDependencies();

    const result = await getDiagnosticForServiceOrder(
      context,
      "service-order-1",
      dependencies
    );

    expect(dependencies.findServiceOrderById).toHaveBeenCalledWith(
      context,
      "service-order-1"
    );
    expect(dependencies.findDiagnosticByServiceOrder).toHaveBeenCalledWith(
      context,
      "service-order-1"
    );
    expect(result).not.toHaveProperty("organizationId");
  });

  it("treats missing or cross-tenant service order as NotFound", async () => {
    await expect(
      getDiagnosticForServiceOrder(
        context,
        "cross-tenant-service-order",
        createDependencies({
          findServiceOrderById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("saves diagnostic only while service order is in diagnosis", async () => {
    const dependencies = createDependencies();

    await saveDiagnosticForServiceOrder(
      context,
      "service-order-1",
      {
        description: "Placa principal com curto no setor de entrada.",
        technicalNotes: "Medido consumo elevado."
      },
      dependencies
    );

    expect(dependencies.saveDiagnosticWithTimeline).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        serviceOrderId: "service-order-1",
        description: "Placa principal com curto no setor de entrada.",
        technicalNotes: "Medido consumo elevado.",
        createTimeline: {
          type: "DIAGNOSTIC_RECORDED",
          description: "Diagnostico tecnico registrado."
        },
        updateTimeline: {
          type: "DIAGNOSTIC_UPDATED",
          description: "Diagnostico tecnico atualizado."
        }
      })
    );
  });

  it.each([
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.WAITING_FOR_APPROVAL,
    ServiceOrderStatus.APPROVED
  ])("rejects diagnostic save when status is %s", async (status) => {
    await expect(
      saveDiagnosticForServiceOrder(
        context,
        "service-order-1",
        {
          description: "Placa principal com curto no setor de entrada."
        },
        createDependencies({
          findServiceOrderById: vi.fn(async () => ({
            ...serviceOrderRecord,
            status
          }))
        })
      )
    ).rejects.toThrow(DomainError);
  });

  it("rejects invalid diagnostic input before repository write", async () => {
    const dependencies = createDependencies();

    await expect(
      saveDiagnosticForServiceOrder(
        context,
        "service-order-1",
        {
          description: "curto"
        },
        dependencies
      )
    ).rejects.toThrow(ValidationError);

    expect(dependencies.saveDiagnosticWithTimeline).not.toHaveBeenCalled();
  });
});
