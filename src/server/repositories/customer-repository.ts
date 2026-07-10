import { Prisma } from "@prisma/client";
import { LIST_PAGE_SIZE } from "@/domain/services/pagination";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const customerListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true
} satisfies Prisma.CustomerSelect;

const customerRecordSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  document: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.CustomerSelect;

const customerDetailsSelect = {
  ...customerRecordSelect,
  equipment: {
    select: {
      id: true,
      type: true,
      brand: true,
      model: true,
      serialNumber: true,
      createdAt: true
    },
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "asc"
      }
    ]
  }
} satisfies Prisma.CustomerSelect;

export type CustomerListRecord = Prisma.CustomerGetPayload<{
  select: typeof customerListSelect;
}>;

export type CustomerRecord = Prisma.CustomerGetPayload<{
  select: typeof customerRecordSelect;
}>;

export type CustomerDetailsRecord = Prisma.CustomerGetPayload<{
  select: typeof customerDetailsSelect;
}>;

export type CustomerListRepositoryInput = {
  page: number;
  query?: string;
};

export type CreateCustomerRecordInput = {
  name: string;
  email?: string;
  phone: string;
  document?: string;
};

export type UpdateCustomerRecordInput = CreateCustomerRecordInput;

function buildCustomerWhere(
  context: TenantContext,
  query: string | undefined
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    organizationId: context.organizationId
  };

  if (!query) {
    return where;
  }

  return {
    ...where,
    OR: [
      {
        name: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        email: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        phone: {
          contains: query,
          mode: "insensitive"
        }
      }
    ]
  };
}

function isPrismaRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export async function listCustomers(
  context: TenantContext,
  input: CustomerListRepositoryInput
): Promise<CustomerListRecord[]> {
  return prisma.customer.findMany({
    where: buildCustomerWhere(context, input.query),
    select: customerListSelect,
    orderBy: [
      {
        name: "asc"
      },
      {
        id: "asc"
      }
    ],
    skip: (input.page - 1) * LIST_PAGE_SIZE,
    take: LIST_PAGE_SIZE
  });
}

export async function countCustomers(
  context: TenantContext,
  query?: string
): Promise<number> {
  return prisma.customer.count({
    where: buildCustomerWhere(context, query)
  });
}

export async function findCustomerById(
  context: TenantContext,
  customerId: string
): Promise<CustomerDetailsRecord | null> {
  return prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: context.organizationId
    },
    select: customerDetailsSelect
  });
}

export async function createCustomer(
  context: TenantContext,
  input: CreateCustomerRecordInput
): Promise<CustomerRecord> {
  return prisma.customer.create({
    data: {
      organizationId: context.organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      document: input.document
    },
    select: customerRecordSelect
  });
}

export async function updateCustomer(
  context: TenantContext,
  customerId: string,
  input: UpdateCustomerRecordInput
): Promise<CustomerRecord | null> {
  try {
    return await prisma.customer.update({
      where: {
        id_organizationId: {
          id: customerId,
          organizationId: context.organizationId
        }
      },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        document: input.document
      },
      select: customerRecordSelect
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}
