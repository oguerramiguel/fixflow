import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  type CustomerField,
  type CustomerInput,
  validateCustomerInput
} from "@/domain/services/customer-validation";
import {
  calculateTotalPages,
  normalizeListInput,
  type ListInput
} from "@/domain/services/pagination";
import {
  countCustomers,
  createCustomer as createCustomerRecord,
  findCustomerById,
  listCustomers,
  updateCustomer as updateCustomerRecord,
  type CreateCustomerRecordInput,
  type CustomerDetailsRecord,
  type CustomerListRecord,
  type CustomerRecord,
  type UpdateCustomerRecordInput
} from "@/server/repositories/customer-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

export type CustomerSummaryDto = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  createdAt: Date;
};

export type CustomerDto = CustomerSummaryDto & {
  document: string | null;
  updatedAt: Date;
};

export type CustomerEquipmentDto = {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  createdAt: Date;
};

export type CustomerDetailsDto = CustomerDto & {
  equipment: CustomerEquipmentDto[];
};

export type CustomerListDto = {
  items: CustomerSummaryDto[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query?: string;
};

export type CustomerServiceDependencies = {
  listCustomers(
    context: TenantContext,
    input: { page: number; query?: string }
  ): Promise<CustomerListRecord[]>;
  countCustomers(context: TenantContext, query?: string): Promise<number>;
  findCustomerById(
    context: TenantContext,
    customerId: string
  ): Promise<CustomerDetailsRecord | null>;
  createCustomer(
    context: TenantContext,
    input: CreateCustomerRecordInput
  ): Promise<CustomerRecord>;
  updateCustomer(
    context: TenantContext,
    customerId: string,
    input: UpdateCustomerRecordInput
  ): Promise<CustomerRecord | null>;
};

const defaultCustomerServiceDependencies: CustomerServiceDependencies = {
  listCustomers,
  countCustomers,
  findCustomerById,
  createCustomer: createCustomerRecord,
  updateCustomer: updateCustomerRecord
};

function createCustomerValidationError(
  fieldErrors: Partial<Record<CustomerField, string>>
): ValidationError<CustomerField> {
  return new ValidationError("Dados do cliente invalidos.", fieldErrors);
}

function mapCustomerSummary(record: CustomerListRecord): CustomerSummaryDto {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    createdAt: record.createdAt
  };
}

function mapCustomer(record: CustomerRecord): CustomerDto {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    document: record.document,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapCustomerDetails(record: CustomerDetailsRecord): CustomerDetailsDto {
  return {
    ...mapCustomer(record),
    equipment: record.equipment.map((equipment) => ({
      id: equipment.id,
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      createdAt: equipment.createdAt
    }))
  };
}

function validateCustomerOrThrow(input: CustomerInput): CreateCustomerRecordInput {
  const validation = validateCustomerInput(input);

  if (!validation.valid) {
    throw createCustomerValidationError(validation.fieldErrors);
  }

  return validation.data;
}

export async function listCustomersForOrganization(
  context: TenantContext,
  input: ListInput,
  dependencies = defaultCustomerServiceDependencies
): Promise<CustomerListDto> {
  const normalizedInput = normalizeListInput(input);
  const [items, totalCount] = await Promise.all([
    dependencies.listCustomers(context, normalizedInput),
    dependencies.countCustomers(context, normalizedInput.query)
  ]);

  return {
    items: items.map(mapCustomerSummary),
    totalCount,
    currentPage: normalizedInput.page,
    totalPages: calculateTotalPages(totalCount),
    query: normalizedInput.query
  };
}

export async function getCustomerDetails(
  context: TenantContext,
  customerId: string,
  dependencies = defaultCustomerServiceDependencies
): Promise<CustomerDetailsDto> {
  const customer = await dependencies.findCustomerById(context, customerId);

  if (!customer) {
    throw new NotFoundError("Cliente nao encontrado.");
  }

  return mapCustomerDetails(customer);
}

export async function createCustomer(
  context: TenantContext,
  input: CustomerInput,
  dependencies = defaultCustomerServiceDependencies
): Promise<CustomerDto> {
  const validatedInput = validateCustomerOrThrow(input);
  const customer = await dependencies.createCustomer(context, validatedInput);

  return mapCustomer(customer);
}

export async function updateCustomer(
  context: TenantContext,
  customerId: string,
  input: CustomerInput,
  dependencies = defaultCustomerServiceDependencies
): Promise<CustomerDto> {
  const validatedInput = validateCustomerOrThrow(input);
  const customer = await dependencies.updateCustomer(
    context,
    customerId,
    validatedInput
  );

  if (!customer) {
    throw new NotFoundError("Cliente nao encontrado.");
  }

  return mapCustomer(customer);
}
