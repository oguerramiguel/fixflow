import { EquipmentType } from "@prisma/client";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { NotFoundError } from "@/domain/errors/not-found-error";
import type {
  EquipmentCreateInput,
  EquipmentUpdateInput
} from "@/domain/services/equipment-validation";
import {
  createEquipment,
  getEquipmentDetails,
  updateEquipment,
  type EquipmentServiceDependencies
} from "@/server/services/equipment-service";
import type { TenantContext } from "@/server/repositories/tenant-context";

const context: TenantContext = {
  organizationId: "org-1"
};

const now = new Date("2026-07-10T00:00:00.000Z");

function createDependencies(
  overrides: Partial<EquipmentServiceDependencies> = {}
): EquipmentServiceDependencies {
  return {
    findCustomerById: vi.fn(async () => ({
      id: "customer-1",
      name: "Maria",
      email: null,
      phone: "11999999999",
      document: null,
      createdAt: now,
      updatedAt: now,
      equipment: []
    })),
    listEquipment: vi.fn(async () => []),
    countEquipment: vi.fn(async () => 0),
    listEquipmentByCustomer: vi.fn(async () => []),
    findEquipmentById: vi.fn(async () => ({
      id: "equipment-1",
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude",
      serialNumber: null,
      accessories: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      customer: {
        id: "customer-1",
        name: "Maria",
        email: null,
        phone: "11999999999"
      }
    })),
    createEquipment: vi.fn(async () => ({
      id: "equipment-1",
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude",
      serialNumber: null,
      accessories: null,
      notes: null,
      createdAt: now,
      updatedAt: now
    })),
    updateEquipment: vi.fn(async () => ({
      id: "equipment-1",
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude",
      serialNumber: null,
      accessories: null,
      notes: null,
      createdAt: now,
      updatedAt: now
    })),
    ...overrides
  };
}

const validCreateInput: EquipmentCreateInput = {
  customerId: "customer-1",
  type: EquipmentType.NOTEBOOK,
  brand: "Dell",
  model: "Latitude",
  serialNumber: "",
  accessories: "",
  notes: ""
};

const validUpdateInput: EquipmentUpdateInput = {
  type: EquipmentType.NOTEBOOK,
  brand: "Dell",
  model: "Latitude",
  serialNumber: "",
  accessories: "",
  notes: ""
};

describe("equipment service", () => {
  it("creates equipment for a customer in the same organization", async () => {
    const dependencies = createDependencies();

    await createEquipment(context, validCreateInput, dependencies);

    expect(dependencies.findCustomerById).toHaveBeenCalledWith(
      context,
      "customer-1"
    );
    expect(dependencies.createEquipment).toHaveBeenCalledWith(context, {
      customerId: "customer-1",
      type: EquipmentType.NOTEBOOK,
      brand: "Dell",
      model: "Latitude",
      serialNumber: undefined,
      accessories: undefined,
      notes: undefined
    });
  });

  it("returns NotFound when the customer does not exist", async () => {
    await expect(
      createEquipment(
        context,
        validCreateInput,
        createDependencies({
          findCustomerById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("treats a customer from another tenant as not found", async () => {
    await expect(
      createEquipment(
        context,
        {
          ...validCreateInput,
          customerId: "cross-tenant-customer"
        },
        createDependencies({
          findCustomerById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("does not obtain equipment from another tenant", async () => {
    await expect(
      getEquipmentDetails(
        context,
        "equipment-1",
        createDependencies({
          findEquipmentById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("does not update equipment from another tenant", async () => {
    await expect(
      updateEquipment(
        context,
        "equipment-1",
        validUpdateInput,
        createDependencies({
          updateEquipment: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("does not pass customerId or organizationId to equipment updates", async () => {
    const dependencies = createDependencies();
    const maliciousInput = {
      ...validUpdateInput,
      customerId: "customer-2",
      organizationId: "org-2"
    };

    await updateEquipment(context, "equipment-1", maliciousInput, dependencies);

    expect(dependencies.updateEquipment).toHaveBeenCalledWith(
      context,
      "equipment-1",
      expect.not.objectContaining({
        customerId: expect.any(String),
        organizationId: expect.any(String)
      })
    );
  });

  it("does not expose organizationId in equipment inputs", () => {
    expectTypeOf<EquipmentCreateInput>().not.toHaveProperty("organizationId");
    expectTypeOf<EquipmentUpdateInput>().not.toHaveProperty("organizationId");
    expectTypeOf<EquipmentUpdateInput>().not.toHaveProperty("customerId");
  });
});
