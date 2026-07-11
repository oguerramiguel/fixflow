import { UserRole } from "@prisma/client";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import {
  assertServiceOrderStatusTransition,
  getAllowedNextServiceOrderStatuses
} from "@/domain/services/service-order-workflow";
import {
  calculateTotalPages,
  normalizeListInput,
  type ListInput
} from "@/domain/services/pagination";
import { createServiceOrderPublicCode } from "@/domain/services/public-code";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";
import {
  createServiceOrderCreatedTimelineDescription,
  createServiceOrderStatusChangedTimelineDescription,
  serviceOrderTimelineTypes
} from "@/domain/services/service-order-timeline";
import {
  type ServiceOrderCreateInput,
  type ServiceOrderField,
  validateRequiredServiceOrderStatusInput,
  validateServiceOrderCreateInput,
  validateServiceOrderStatusInput
} from "@/domain/services/service-order-validation";
import { requireRole } from "@/server/auth/authorization";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { findEquipmentById } from "@/server/repositories/equipment-repository";
import {
  countServiceOrders,
  createServiceOrderWithInitialTimeline,
  findServiceOrderById,
  listServiceOrders,
  PublicCodeCollisionError,
  transitionServiceOrderStatus as transitionServiceOrderStatusRecord,
  type CreateServiceOrderRecordInput,
  type ServiceOrderDetailsRecord,
  type ServiceOrderListRecord,
  type ServiceOrderRecord,
  type TransitionServiceOrderStatusInput
} from "@/server/repositories/service-order-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

export const SERVICE_ORDER_PUBLIC_CODE_MAX_ATTEMPTS = 5;

export type ServiceOrderCustomerDto = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
};

export type ServiceOrderEquipmentDto = {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string | null;
};

export type ServiceOrderSummaryDto = {
  id: string;
  publicCode: string;
  reportedIssue: string;
  status: ServiceOrderStatus;
  statusLabel: string;
  createdAt: Date;
  customer: Pick<ServiceOrderCustomerDto, "id" | "name">;
  equipment: ServiceOrderEquipmentDto;
};

export type ServiceOrderTimelineDto = {
  id: string;
  type: string;
  description: string;
  createdAt: Date;
};

export type ServiceOrderDto = ServiceOrderSummaryDto & {
  updatedAt: Date;
  customer: ServiceOrderCustomerDto;
};

export type ServiceOrderDetailsDto = ServiceOrderDto & {
  timeline: ServiceOrderTimelineDto[];
  allowedNextStatuses: ServiceOrderStatus[];
};

export type ServiceOrderListDto = {
  items: ServiceOrderSummaryDto[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query?: string;
  status?: ServiceOrderStatus;
};

export type ServiceOrderListInput = ListInput & {
  status?: string;
};

export type ServiceOrderServiceDependencies = {
  findEquipmentById(
    context: TenantContext,
    equipmentId: string
  ): ReturnType<typeof findEquipmentById>;
  listServiceOrders(
    context: TenantContext,
    input: {
      page: number;
      query?: string;
      status?: ServiceOrderStatus;
    }
  ): Promise<ServiceOrderListRecord[]>;
  countServiceOrders(
    context: TenantContext,
    input: {
      query?: string;
      status?: ServiceOrderStatus;
    }
  ): Promise<number>;
  findServiceOrderById(
    context: TenantContext,
    serviceOrderId: string
  ): Promise<ServiceOrderDetailsRecord | null>;
  createServiceOrderWithInitialTimeline(
    context: TenantContext,
    input: CreateServiceOrderRecordInput
  ): Promise<ServiceOrderRecord>;
  transitionServiceOrderStatus(
    context: TenantContext,
    input: TransitionServiceOrderStatusInput
  ): Promise<ServiceOrderRecord | null>;
  createPublicCode(): string;
};

const defaultServiceOrderServiceDependencies: ServiceOrderServiceDependencies = {
  findEquipmentById,
  listServiceOrders,
  countServiceOrders,
  findServiceOrderById,
  createServiceOrderWithInitialTimeline,
  transitionServiceOrderStatus: transitionServiceOrderStatusRecord,
  createPublicCode: createServiceOrderPublicCode
};

function createServiceOrderValidationError(
  fieldErrors: Partial<Record<ServiceOrderField, string>>
): ValidationError<ServiceOrderField> {
  return new ValidationError("Dados da ordem de servico invalidos.", fieldErrors);
}

function createPublicCodeGenerationError(): DomainError {
  return new DomainError(
    "Nao foi possivel gerar um codigo publico unico para a ordem de servico. Tente novamente."
  );
}

function mapServiceOrderSummary(
  record: ServiceOrderListRecord
): ServiceOrderSummaryDto {
  return {
    id: record.id,
    publicCode: record.publicCode,
    reportedIssue: record.reportedIssue,
    status: record.status,
    statusLabel: getServiceOrderStatusLabel(record.status),
    createdAt: record.createdAt,
    customer: {
      id: record.customer.id,
      name: record.customer.name
    },
    equipment: {
      id: record.equipment.id,
      type: record.equipment.type,
      brand: record.equipment.brand,
      model: record.equipment.model,
      serialNumber: record.equipment.serialNumber
    }
  };
}

function mapServiceOrder(record: ServiceOrderRecord): ServiceOrderDto {
  return {
    id: record.id,
    publicCode: record.publicCode,
    reportedIssue: record.reportedIssue,
    status: record.status,
    statusLabel: getServiceOrderStatusLabel(record.status),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    customer: {
      id: record.customer.id,
      name: record.customer.name,
      email: record.customer.email,
      phone: record.customer.phone
    },
    equipment: {
      id: record.equipment.id,
      type: record.equipment.type,
      brand: record.equipment.brand,
      model: record.equipment.model,
      serialNumber: record.equipment.serialNumber
    }
  };
}

function mapServiceOrderDetails(
  record: ServiceOrderDetailsRecord
): ServiceOrderDetailsDto {
  return {
    ...mapServiceOrder(record),
    timeline: record.timeline.map((event) => ({
      id: event.id,
      type: event.type,
      description: event.description,
      createdAt: event.createdAt
    })),
    allowedNextStatuses: getAllowedNextServiceOrderStatuses(record.status)
  };
}

function validateServiceOrderCreateInputOrThrow(
  input: ServiceOrderCreateInput
): ServiceOrderCreateInput {
  const validation = validateServiceOrderCreateInput(input);

  if (!validation.valid) {
    throw createServiceOrderValidationError(validation.fieldErrors);
  }

  return validation.data;
}

function validateServiceOrderStatusFilterOrThrow(
  status: string | undefined
): ServiceOrderStatus | undefined {
  const validation = validateServiceOrderStatusInput(status);

  if (!validation.valid) {
    throw createServiceOrderValidationError(validation.fieldErrors);
  }

  return validation.data;
}

function validateTargetStatusOrThrow(targetStatus: string): ServiceOrderStatus {
  const validation = validateRequiredServiceOrderStatusInput(targetStatus);

  if (!validation.valid) {
    throw createServiceOrderValidationError(validation.fieldErrors);
  }

  return validation.data;
}

export async function listServiceOrdersForOrganization(
  context: TenantContext,
  input: ServiceOrderListInput,
  dependencies = defaultServiceOrderServiceDependencies
): Promise<ServiceOrderListDto> {
  const normalizedInput = normalizeListInput(input);
  const status = validateServiceOrderStatusFilterOrThrow(input.status);
  const [items, totalCount] = await Promise.all([
    dependencies.listServiceOrders(context, {
      ...normalizedInput,
      status
    }),
    dependencies.countServiceOrders(context, {
      query: normalizedInput.query,
      status
    })
  ]);

  return {
    items: items.map(mapServiceOrderSummary),
    totalCount,
    currentPage: normalizedInput.page,
    totalPages: calculateTotalPages(totalCount),
    query: normalizedInput.query,
    status
  };
}

export async function getServiceOrderDetails(
  context: TenantContext,
  serviceOrderId: string,
  dependencies = defaultServiceOrderServiceDependencies
): Promise<ServiceOrderDetailsDto> {
  const serviceOrder = await dependencies.findServiceOrderById(
    context,
    serviceOrderId
  );

  if (!serviceOrder) {
    throw new NotFoundError("Ordem de servico nao encontrada.");
  }

  return mapServiceOrderDetails(serviceOrder);
}

export async function createServiceOrder(
  context: AuthenticatedContext,
  input: ServiceOrderCreateInput,
  dependencies = defaultServiceOrderServiceDependencies
): Promise<ServiceOrderDto> {
  const validatedInput = validateServiceOrderCreateInputOrThrow(input);
  const equipment = await dependencies.findEquipmentById(
    context,
    validatedInput.equipmentId
  );

  if (!equipment) {
    throw new NotFoundError("Equipamento nao encontrado.");
  }

  for (let attempt = 1; attempt <= SERVICE_ORDER_PUBLIC_CODE_MAX_ATTEMPTS; attempt += 1) {
    const publicCode = dependencies.createPublicCode();

    try {
      const serviceOrder = await dependencies.createServiceOrderWithInitialTimeline(
        context,
        {
          customerId: equipment.customerId,
          equipmentId: equipment.id,
          publicCode,
          reportedIssue: validatedInput.reportedIssue,
          initialTimeline: {
            type: serviceOrderTimelineTypes.serviceOrderCreated,
            description: createServiceOrderCreatedTimelineDescription()
          }
        }
      );

      return mapServiceOrder(serviceOrder);
    } catch (error) {
      if (
        error instanceof PublicCodeCollisionError &&
        attempt < SERVICE_ORDER_PUBLIC_CODE_MAX_ATTEMPTS
      ) {
        continue;
      }

      if (error instanceof PublicCodeCollisionError) {
        throw createPublicCodeGenerationError();
      }

      throw error;
    }
  }

  throw createPublicCodeGenerationError();
}

export async function transitionServiceOrderStatus(
  context: AuthenticatedContext,
  serviceOrderId: string,
  targetStatusInput: string,
  dependencies = defaultServiceOrderServiceDependencies
): Promise<ServiceOrderDto> {
  const targetStatus = validateTargetStatusOrThrow(targetStatusInput);
  const serviceOrder = await dependencies.findServiceOrderById(
    context,
    serviceOrderId
  );

  if (!serviceOrder) {
    throw new NotFoundError("Ordem de servico nao encontrada.");
  }

  assertServiceOrderStatusTransition(serviceOrder.status, targetStatus);

  if (targetStatus === "CANCELLED") {
    requireRole(context, [UserRole.OWNER, UserRole.ADMIN]);
  }

  const transitionedServiceOrder = await dependencies.transitionServiceOrderStatus(
    context,
    {
      serviceOrderId: serviceOrder.id,
      currentStatus: serviceOrder.status,
      targetStatus,
      timeline: {
        type: serviceOrderTimelineTypes.statusChanged,
        description: createServiceOrderStatusChangedTimelineDescription(
          serviceOrder.status,
          targetStatus
        )
      }
    }
  );

  if (!transitionedServiceOrder) {
    throw new ConflictError();
  }

  return mapServiceOrder(transitionedServiceOrder);
}
