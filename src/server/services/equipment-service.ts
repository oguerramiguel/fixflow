import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  type EquipmentCreateInput,
  type EquipmentField,
  type EquipmentUpdateInput,
  validateEquipmentCreateInput,
  validateEquipmentUpdateInput
} from "@/domain/services/equipment-validation";
import {
  calculateTotalPages,
  normalizeListInput,
  type ListInput
} from "@/domain/services/pagination";
import {
  findCustomerById,
  type CustomerDetailsRecord
} from "@/server/repositories/customer-repository";
import {
  countEquipment,
  createEquipment as createEquipmentRecord,
  findEquipmentById,
  listEquipment,
  listEquipmentByCustomer,
  updateEquipment as updateEquipmentRecord,
  type CreateEquipmentRecordInput,
  type EquipmentDetailsRecord,
  type EquipmentListRecord,
  type EquipmentRecord,
  type UpdateEquipmentRecordInput
} from "@/server/repositories/equipment-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

export type EquipmentCustomerDto = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
};

export type EquipmentSummaryDto = {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  createdAt: Date;
  customer: EquipmentCustomerDto;
};

export type EquipmentDto = {
  id: string;
  customerId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  accessories: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EquipmentDetailsDto = EquipmentDto & {
  customer: EquipmentCustomerDto;
};

export type EquipmentListDto = {
  items: EquipmentSummaryDto[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query?: string;
};

export type EquipmentServiceDependencies = {
  findCustomerById(
    context: TenantContext,
    customerId: string
  ): Promise<CustomerDetailsRecord | null>;
  listEquipment(
    context: TenantContext,
    input: { page: number; query?: string }
  ): Promise<EquipmentListRecord[]>;
  countEquipment(context: TenantContext, query?: string): Promise<number>;
  listEquipmentByCustomer(
    context: TenantContext,
    customerId: string
  ): Promise<EquipmentListRecord[]>;
  findEquipmentById(
    context: TenantContext,
    equipmentId: string
  ): Promise<EquipmentDetailsRecord | null>;
  createEquipment(
    context: TenantContext,
    input: CreateEquipmentRecordInput
  ): Promise<EquipmentRecord>;
  updateEquipment(
    context: TenantContext,
    equipmentId: string,
    input: UpdateEquipmentRecordInput
  ): Promise<EquipmentRecord | null>;
};

const defaultEquipmentServiceDependencies: EquipmentServiceDependencies = {
  findCustomerById,
  listEquipment,
  countEquipment,
  listEquipmentByCustomer,
  findEquipmentById,
  createEquipment: createEquipmentRecord,
  updateEquipment: updateEquipmentRecord
};

function createEquipmentValidationError(
  fieldErrors: Partial<Record<EquipmentField, string>>
): ValidationError<EquipmentField> {
  return new ValidationError("Dados do equipamento invalidos.", fieldErrors);
}

function mapEquipmentSummary(record: EquipmentListRecord): EquipmentSummaryDto {
  return {
    id: record.id,
    type: record.type,
    brand: record.brand,
    model: record.model,
    serialNumber: record.serialNumber,
    createdAt: record.createdAt,
    customer: {
      id: record.customer.id,
      name: record.customer.name
    }
  };
}

function mapEquipment(record: EquipmentRecord): EquipmentDto {
  return {
    id: record.id,
    customerId: record.customerId,
    type: record.type,
    brand: record.brand,
    model: record.model,
    serialNumber: record.serialNumber,
    accessories: record.accessories,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapEquipmentDetails(
  record: EquipmentDetailsRecord
): EquipmentDetailsDto {
  return {
    ...mapEquipment(record),
    customer: {
      id: record.customer.id,
      name: record.customer.name,
      email: record.customer.email,
      phone: record.customer.phone
    }
  };
}

export async function listEquipmentForOrganization(
  context: TenantContext,
  input: ListInput,
  dependencies = defaultEquipmentServiceDependencies
): Promise<EquipmentListDto> {
  const normalizedInput = normalizeListInput(input);
  const [items, totalCount] = await Promise.all([
    dependencies.listEquipment(context, normalizedInput),
    dependencies.countEquipment(context, normalizedInput.query)
  ]);

  return {
    items: items.map(mapEquipmentSummary),
    totalCount,
    currentPage: normalizedInput.page,
    totalPages: calculateTotalPages(totalCount),
    query: normalizedInput.query
  };
}

export async function listCustomerEquipment(
  context: TenantContext,
  customerId: string,
  dependencies = defaultEquipmentServiceDependencies
): Promise<EquipmentSummaryDto[]> {
  const equipment = await dependencies.listEquipmentByCustomer(
    context,
    customerId
  );

  return equipment.map(mapEquipmentSummary);
}

export async function getEquipmentDetails(
  context: TenantContext,
  equipmentId: string,
  dependencies = defaultEquipmentServiceDependencies
): Promise<EquipmentDetailsDto> {
  const equipment = await dependencies.findEquipmentById(context, equipmentId);

  if (!equipment) {
    throw new NotFoundError("Equipamento nao encontrado.");
  }

  return mapEquipmentDetails(equipment);
}

export async function createEquipment(
  context: TenantContext,
  input: EquipmentCreateInput,
  dependencies = defaultEquipmentServiceDependencies
): Promise<EquipmentDto> {
  const validation = validateEquipmentCreateInput(input);

  if (!validation.valid) {
    throw createEquipmentValidationError(validation.fieldErrors);
  }

  const customer = await dependencies.findCustomerById(
    context,
    validation.data.customerId
  );

  if (!customer) {
    throw new NotFoundError("Cliente nao encontrado.");
  }

  const equipment = await dependencies.createEquipment(context, validation.data);

  return mapEquipment(equipment);
}

export async function updateEquipment(
  context: TenantContext,
  equipmentId: string,
  input: EquipmentUpdateInput,
  dependencies = defaultEquipmentServiceDependencies
): Promise<EquipmentDto> {
  const validation = validateEquipmentUpdateInput(input);

  if (!validation.valid) {
    throw createEquipmentValidationError(validation.fieldErrors);
  }

  const equipment = await dependencies.updateEquipment(
    context,
    equipmentId,
    validation.data
  );

  if (!equipment) {
    throw new NotFoundError("Equipamento nao encontrado.");
  }

  return mapEquipment(equipment);
}
