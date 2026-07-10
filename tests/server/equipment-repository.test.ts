import { EquipmentType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  equipment: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    equipment: mocks.equipment
  }
}));

import {
  countEquipment,
  createEquipment,
  findEquipmentById,
  listEquipment,
  listEquipmentByCustomer,
  updateEquipment
} from "@/server/repositories/equipment-repository";

const context: TenantContext = {
  organizationId: "org-1"
};

describe("equipment repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists equipment using organizationId and search filters", async () => {
    mocks.equipment.findMany.mockResolvedValueOnce([]);

    await listEquipment(context, {
      page: 1,
      query: "dell"
    });

    expect(mocks.equipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          OR: [
            {
              brand: {
                contains: "dell",
                mode: "insensitive"
              }
            },
            {
              model: {
                contains: "dell",
                mode: "insensitive"
              }
            },
            {
              serialNumber: {
                contains: "dell",
                mode: "insensitive"
              }
            }
          ]
        }),
        skip: 0,
        take: 20
      })
    );
  });

  it("counts equipment with the same tenant and search filter", async () => {
    mocks.equipment.count.mockResolvedValueOnce(0);

    await countEquipment(context, "dell");

    expect(mocks.equipment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        OR: expect.any(Array)
      })
    });
  });

  it("lists equipment by customer using organizationId and customerId", async () => {
    mocks.equipment.findMany.mockResolvedValueOnce([]);

    await listEquipmentByCustomer(context, "customer-1");

    expect(mocks.equipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          customerId: "customer-1"
        }
      })
    );
  });

  it("finds equipment by id and organizationId", async () => {
    mocks.equipment.findFirst.mockResolvedValueOnce(null);

    await findEquipmentById(context, "equipment-1");

    expect(mocks.equipment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "equipment-1",
          organizationId: "org-1"
        }
      })
    );
  });

  it("creates equipment forcing organizationId from context", async () => {
    mocks.equipment.create.mockResolvedValueOnce({
      id: "equipment-1",
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude",
      serialNumber: null,
      accessories: null,
      notes: null,
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z")
    });

    await createEquipment(context, {
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude"
    });

    expect(mocks.equipment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          customerId: "customer-1"
        })
      })
    );
  });

  it("updates equipment using id and organizationId", async () => {
    mocks.equipment.update.mockResolvedValueOnce({
      id: "equipment-1",
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude",
      serialNumber: null,
      accessories: null,
      notes: null,
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z")
    });

    await updateEquipment(context, "equipment-1", {
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude"
    });

    expect(mocks.equipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_organizationId: {
            id: "equipment-1",
            organizationId: "org-1"
          }
        },
        data: expect.not.objectContaining({
          customerId: expect.any(String),
          organizationId: expect.any(String)
        })
      })
    );
  });
});
