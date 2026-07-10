import { Prisma } from "@prisma/client";
import { LIST_PAGE_SIZE } from "@/domain/services/pagination";
import { prisma } from "@/server/db/prisma";
import type { TenantContext } from "@/server/repositories/tenant-context";

const equipmentListSelect = {
  id: true,
  type: true,
  brand: true,
  model: true,
  serialNumber: true,
  createdAt: true,
  customer: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.EquipmentSelect;

const equipmentRecordSelect = {
  id: true,
  customerId: true,
  type: true,
  brand: true,
  model: true,
  serialNumber: true,
  accessories: true,
  notes: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.EquipmentSelect;

const equipmentDetailsSelect = {
  ...equipmentRecordSelect,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true
    }
  }
} satisfies Prisma.EquipmentSelect;

export type EquipmentListRecord = Prisma.EquipmentGetPayload<{
  select: typeof equipmentListSelect;
}>;

export type EquipmentRecord = Prisma.EquipmentGetPayload<{
  select: typeof equipmentRecordSelect;
}>;

export type EquipmentDetailsRecord = Prisma.EquipmentGetPayload<{
  select: typeof equipmentDetailsSelect;
}>;

export type EquipmentListRepositoryInput = {
  page: number;
  query?: string;
};

export type CreateEquipmentRecordInput = {
  customerId: string;
  type: EquipmentRecord["type"];
  brand: string;
  model: string;
  serialNumber?: string;
  accessories?: string;
  notes?: string;
};

export type UpdateEquipmentRecordInput = Omit<
  CreateEquipmentRecordInput,
  "customerId"
>;

function buildEquipmentWhere(
  context: TenantContext,
  query: string | undefined
): Prisma.EquipmentWhereInput {
  const where: Prisma.EquipmentWhereInput = {
    organizationId: context.organizationId
  };

  if (!query) {
    return where;
  }

  return {
    ...where,
    OR: [
      {
        brand: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        model: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        serialNumber: {
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

export async function listEquipment(
  context: TenantContext,
  input: EquipmentListRepositoryInput
): Promise<EquipmentListRecord[]> {
  return prisma.equipment.findMany({
    where: buildEquipmentWhere(context, input.query),
    select: equipmentListSelect,
    orderBy: [
      {
        brand: "asc"
      },
      {
        model: "asc"
      },
      {
        id: "asc"
      }
    ],
    skip: (input.page - 1) * LIST_PAGE_SIZE,
    take: LIST_PAGE_SIZE
  });
}

export async function countEquipment(
  context: TenantContext,
  query?: string
): Promise<number> {
  return prisma.equipment.count({
    where: buildEquipmentWhere(context, query)
  });
}

export async function listEquipmentByCustomer(
  context: TenantContext,
  customerId: string
): Promise<EquipmentListRecord[]> {
  return prisma.equipment.findMany({
    where: {
      organizationId: context.organizationId,
      customerId
    },
    select: equipmentListSelect,
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "asc"
      }
    ]
  });
}

export async function findEquipmentById(
  context: TenantContext,
  equipmentId: string
): Promise<EquipmentDetailsRecord | null> {
  return prisma.equipment.findFirst({
    where: {
      id: equipmentId,
      organizationId: context.organizationId
    },
    select: equipmentDetailsSelect
  });
}

export async function createEquipment(
  context: TenantContext,
  input: CreateEquipmentRecordInput
): Promise<EquipmentRecord> {
  return prisma.equipment.create({
    data: {
      organizationId: context.organizationId,
      customerId: input.customerId,
      type: input.type,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      accessories: input.accessories,
      notes: input.notes
    },
    select: equipmentRecordSelect
  });
}

export async function updateEquipment(
  context: TenantContext,
  equipmentId: string,
  input: UpdateEquipmentRecordInput
): Promise<EquipmentRecord | null> {
  try {
    return await prisma.equipment.update({
      where: {
        id_organizationId: {
          id: equipmentId,
          organizationId: context.organizationId
        }
      },
      data: {
        type: input.type,
        brand: input.brand,
        model: input.model,
        serialNumber: input.serialNumber,
        accessories: input.accessories,
        notes: input.notes
      },
      select: equipmentRecordSelect
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}
