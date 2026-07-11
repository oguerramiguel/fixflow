import { Prisma } from "@prisma/client";
import type { ServiceOrderTimelineType } from "@/domain/services/service-order-timeline";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const diagnosticRecordSelect = {
  id: true,
  serviceOrderId: true,
  description: true,
  technicalNotes: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.DiagnosticSelect;

export type DiagnosticRecord = Prisma.DiagnosticGetPayload<{
  select: typeof diagnosticRecordSelect;
}>;

export type SaveDiagnosticRecordInput = {
  serviceOrderId: string;
  description: string;
  technicalNotes?: string;
  createTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
  updateTimeline: {
    type: ServiceOrderTimelineType;
    description: string;
  };
};

export type SaveDiagnosticRecordResult = {
  diagnostic: DiagnosticRecord;
  operation: "created" | "updated";
};

export async function findDiagnosticByServiceOrder(
  context: TenantContext,
  serviceOrderId: string
): Promise<DiagnosticRecord | null> {
  return prisma.diagnostic.findFirst({
    where: {
      serviceOrderId,
      organizationId: context.organizationId
    },
    select: diagnosticRecordSelect
  });
}

export async function saveDiagnosticWithTimeline(
  context: TenantContext,
  input: SaveDiagnosticRecordInput
): Promise<SaveDiagnosticRecordResult> {
  return prisma.$transaction(async (transaction) => {
    const existingDiagnostic = await transaction.diagnostic.findFirst({
      where: {
        serviceOrderId: input.serviceOrderId,
        organizationId: context.organizationId
      },
      select: {
        id: true
      }
    });

    if (existingDiagnostic) {
      const diagnostic = await transaction.diagnostic.update({
        where: {
          id_organizationId: {
            id: existingDiagnostic.id,
            organizationId: context.organizationId
          }
        },
        data: {
          description: input.description,
          technicalNotes: input.technicalNotes
        },
        select: diagnosticRecordSelect
      });

      await transaction.serviceOrderTimeline.create({
        data: {
          organizationId: context.organizationId,
          serviceOrderId: input.serviceOrderId,
          type: input.updateTimeline.type,
          description: input.updateTimeline.description
        }
      });

      return {
        diagnostic,
        operation: "updated"
      };
    }

    const diagnostic = await transaction.diagnostic.create({
      data: {
        organizationId: context.organizationId,
        serviceOrderId: input.serviceOrderId,
        description: input.description,
        technicalNotes: input.technicalNotes
      },
      select: diagnosticRecordSelect
    });

    await transaction.serviceOrderTimeline.create({
      data: {
        organizationId: context.organizationId,
        serviceOrderId: input.serviceOrderId,
        type: input.createTimeline.type,
        description: input.createTimeline.description
      }
    });

    return {
      diagnostic,
      operation: "created"
    };
  });
}
