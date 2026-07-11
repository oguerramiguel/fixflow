import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  diagnostic: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  serviceOrderTimeline: {
    create: vi.fn()
  },
  transaction: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    diagnostic: mocks.diagnostic,
    serviceOrderTimeline: mocks.serviceOrderTimeline,
    $transaction: mocks.transaction
  }
}));

import {
  findDiagnosticByServiceOrder,
  saveDiagnosticWithTimeline,
  type SaveDiagnosticRecordInput
} from "@/server/repositories/diagnostic-repository";

const context: TenantContext = {
  organizationId: "org-1"
};

const diagnosticRecord = {
  id: "diagnostic-1",
  serviceOrderId: "service-order-1",
  description: "Placa principal com curto no setor de entrada.",
  technicalNotes: null,
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: new Date("2026-07-10T00:00:00.000Z")
};

const saveInput = {
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
} satisfies SaveDiagnosticRecordInput;

describe("diagnostic repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        diagnostic: mocks.diagnostic,
        serviceOrderTimeline: mocks.serviceOrderTimeline
      })
    );
  });

  it("finds diagnostic by serviceOrderId and organizationId", async () => {
    mocks.diagnostic.findFirst.mockResolvedValueOnce(null);

    await findDiagnosticByServiceOrder(context, "service-order-1");

    expect(mocks.diagnostic.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serviceOrderId: "service-order-1",
          organizationId: "org-1"
        }
      })
    );
  });

  it("creates diagnostic and timeline in one transaction", async () => {
    mocks.diagnostic.findFirst.mockResolvedValueOnce(null);
    mocks.diagnostic.create.mockResolvedValueOnce(diagnosticRecord);

    const result = await saveDiagnosticWithTimeline(context, saveInput);

    expect(result.operation).toBe("created");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.diagnostic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          serviceOrderId: "service-order-1"
        })
      })
    );
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        serviceOrderId: "service-order-1",
        type: "DIAGNOSTIC_RECORDED",
        description: "Diagnostico tecnico registrado."
      }
    });
  });

  it("updates diagnostic and timeline in one transaction", async () => {
    mocks.diagnostic.findFirst.mockResolvedValueOnce({
      id: "diagnostic-1"
    });
    mocks.diagnostic.update.mockResolvedValueOnce(diagnosticRecord);

    const result = await saveDiagnosticWithTimeline(context, saveInput);

    expect(result.operation).toBe("updated");
    expect(mocks.diagnostic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_organizationId: {
            id: "diagnostic-1",
            organizationId: "org-1"
          }
        }
      })
    );
    expect(mocks.serviceOrderTimeline.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        serviceOrderId: "service-order-1",
        type: "DIAGNOSTIC_UPDATED",
        description: "Diagnostico tecnico atualizado."
      }
    });
  });
});
