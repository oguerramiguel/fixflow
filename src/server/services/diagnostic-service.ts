import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  type DiagnosticField,
  type DiagnosticInput,
  validateDiagnosticInput
} from "@/domain/services/diagnostic-validation";
import {
  createDiagnosticRecordedTimelineDescription,
  createDiagnosticUpdatedTimelineDescription,
  serviceOrderTimelineTypes
} from "@/domain/services/service-order-timeline";
import {
  findDiagnosticByServiceOrder,
  saveDiagnosticWithTimeline,
  type DiagnosticRecord,
  type SaveDiagnosticRecordInput,
  type SaveDiagnosticRecordResult
} from "@/server/repositories/diagnostic-repository";
import {
  findServiceOrderById,
  type ServiceOrderDetailsRecord
} from "@/server/repositories/service-order-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

export type DiagnosticDto = {
  id: string;
  serviceOrderId: string;
  description: string;
  technicalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DiagnosticServiceDependencies = {
  findServiceOrderById(
    context: TenantContext,
    serviceOrderId: string
  ): Promise<ServiceOrderDetailsRecord | null>;
  findDiagnosticByServiceOrder(
    context: TenantContext,
    serviceOrderId: string
  ): Promise<DiagnosticRecord | null>;
  saveDiagnosticWithTimeline(
    context: TenantContext,
    input: SaveDiagnosticRecordInput
  ): Promise<SaveDiagnosticRecordResult>;
};

const defaultDiagnosticServiceDependencies: DiagnosticServiceDependencies = {
  findServiceOrderById,
  findDiagnosticByServiceOrder,
  saveDiagnosticWithTimeline
};

function createDiagnosticValidationError(
  fieldErrors: Partial<Record<DiagnosticField, string>>
): ValidationError<DiagnosticField> {
  return new ValidationError("Dados do diagnostico invalidos.", fieldErrors);
}

function mapDiagnostic(record: DiagnosticRecord): DiagnosticDto {
  return {
    id: record.id,
    serviceOrderId: record.serviceOrderId,
    description: record.description,
    technicalNotes: record.technicalNotes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

async function findServiceOrderOrThrow(
  context: TenantContext,
  serviceOrderId: string,
  dependencies: DiagnosticServiceDependencies
): Promise<ServiceOrderDetailsRecord> {
  const serviceOrder = await dependencies.findServiceOrderById(
    context,
    serviceOrderId
  );

  if (!serviceOrder) {
    throw new NotFoundError("Ordem de servico nao encontrada.");
  }

  return serviceOrder;
}

export async function getDiagnosticForServiceOrder(
  context: TenantContext,
  serviceOrderId: string,
  dependencies = defaultDiagnosticServiceDependencies
): Promise<DiagnosticDto | null> {
  await findServiceOrderOrThrow(context, serviceOrderId, dependencies);

  const diagnostic = await dependencies.findDiagnosticByServiceOrder(
    context,
    serviceOrderId
  );

  return diagnostic ? mapDiagnostic(diagnostic) : null;
}

export async function saveDiagnosticForServiceOrder(
  context: TenantContext,
  serviceOrderId: string,
  input: DiagnosticInput,
  dependencies = defaultDiagnosticServiceDependencies
): Promise<DiagnosticDto> {
  const validation = validateDiagnosticInput(input);

  if (!validation.valid) {
    throw createDiagnosticValidationError(validation.fieldErrors);
  }

  const serviceOrder = await findServiceOrderOrThrow(
    context,
    serviceOrderId,
    dependencies
  );

  if (serviceOrder.status !== "IN_DIAGNOSIS") {
    throw new DomainError(
      "Diagnostico tecnico so pode ser alterado enquanto a ordem esta em diagnostico."
    );
  }

  const result = await dependencies.saveDiagnosticWithTimeline(context, {
    serviceOrderId: serviceOrder.id,
    description: validation.data.description,
    technicalNotes: validation.data.technicalNotes,
    createTimeline: {
      type: serviceOrderTimelineTypes.diagnosticRecorded,
      description: createDiagnosticRecordedTimelineDescription()
    },
    updateTimeline: {
      type: serviceOrderTimelineTypes.diagnosticUpdated,
      description: createDiagnosticUpdatedTimelineDescription()
    }
  });

  return mapDiagnostic(result.diagnostic);
}
