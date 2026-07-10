import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { CustomerInput } from "@/domain/services/customer-validation";
import {
  createCustomer,
  getCustomerDetails,
  listCustomersForOrganization,
  updateCustomer,
  type CustomerServiceDependencies
} from "@/server/services/customer-service";
import type { TenantContext } from "@/server/repositories/tenant-context";

const context: TenantContext = {
  organizationId: "org-1"
};

const now = new Date("2026-07-10T00:00:00.000Z");

function createDependencies(
  overrides: Partial<CustomerServiceDependencies> = {}
): CustomerServiceDependencies {
  return {
    listCustomers: vi.fn(async () => []),
    countCustomers: vi.fn(async () => 0),
    findCustomerById: vi.fn(async () => ({
      id: "customer-1",
      name: "Maria",
      email: "maria@example.com",
      phone: "11999999999",
      document: null,
      createdAt: now,
      updatedAt: now,
      equipment: []
    })),
    createCustomer: vi.fn(async () => ({
      id: "customer-1",
      name: "Maria",
      email: null,
      phone: "11999999999",
      document: null,
      createdAt: now,
      updatedAt: now
    })),
    updateCustomer: vi.fn(async () => ({
      id: "customer-1",
      name: "Maria",
      email: null,
      phone: "11999999999",
      document: null,
      createdAt: now,
      updatedAt: now
    })),
    ...overrides
  };
}

describe("customer service", () => {
  it("creates a valid customer", async () => {
    const dependencies = createDependencies();

    const result = await createCustomer(
      context,
      {
        name: "  Maria  ",
        email: "",
        phone: "11999999999",
        document: ""
      },
      dependencies
    );

    expect(dependencies.createCustomer).toHaveBeenCalledWith(context, {
      name: "Maria",
      email: undefined,
      phone: "11999999999",
      document: undefined
    });
    expect(result.id).toBe("customer-1");
  });

  it("rejects invalid customer input", async () => {
    await expect(
      createCustomer(
        context,
        {
          name: "A",
          email: "",
          phone: "",
          document: ""
        },
        createDependencies()
      )
    ).rejects.toThrow(ValidationError);
  });

  it("passes the trusted tenant context to listing dependencies", async () => {
    const dependencies = createDependencies();

    await listCustomersForOrganization(
      context,
      {
        page: 0,
        query: "  maria "
      },
      dependencies
    );

    expect(dependencies.listCustomers).toHaveBeenCalledWith(context, {
      page: 1,
      query: "maria"
    });
    expect(dependencies.countCustomers).toHaveBeenCalledWith(context, "maria");
  });

  it("returns NotFound for missing details", async () => {
    await expect(
      getCustomerDetails(
        context,
        "customer-1",
        createDependencies({
          findCustomerById: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("returns NotFound for missing updates", async () => {
    await expect(
      updateCustomer(
        context,
        "customer-1",
        {
          name: "Maria",
          email: "",
          phone: "11999999999",
          document: ""
        },
        createDependencies({
          updateCustomer: vi.fn(async () => null)
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("does not expose organizationId in customer input", () => {
    expectTypeOf<CustomerInput>().not.toHaveProperty("organizationId");
  });
});
