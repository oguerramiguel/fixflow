import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@/server/repositories/tenant-context";

const mocks = vi.hoisted(() => ({
  customer: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    customer: mocks.customer
  }
}));

import {
  countCustomers,
  createCustomer,
  findCustomerById,
  listCustomers,
  updateCustomer
} from "@/server/repositories/customer-repository";

const context: TenantContext = {
  organizationId: "org-1"
};

describe("customer repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists customers using organizationId and search filters", async () => {
    mocks.customer.findMany.mockResolvedValueOnce([]);

    await listCustomers(context, {
      page: 2,
      query: "maria"
    });

    expect(mocks.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          OR: [
            {
              name: {
                contains: "maria",
                mode: "insensitive"
              }
            },
            {
              email: {
                contains: "maria",
                mode: "insensitive"
              }
            },
            {
              phone: {
                contains: "maria",
                mode: "insensitive"
              }
            }
          ]
        }),
        skip: 20,
        take: 20
      })
    );
  });

  it("counts customers with the same tenant and search filter", async () => {
    mocks.customer.count.mockResolvedValueOnce(0);

    await countCustomers(context, "maria");

    expect(mocks.customer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        OR: expect.any(Array)
      })
    });
  });

  it("finds a customer by id and organizationId", async () => {
    mocks.customer.findFirst.mockResolvedValueOnce(null);

    await findCustomerById(context, "customer-1");

    expect(mocks.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "customer-1",
          organizationId: "org-1"
        }
      })
    );
  });

  it("creates customers forcing organizationId from context", async () => {
    mocks.customer.create.mockResolvedValueOnce({
      id: "customer-1",
      name: "Maria",
      email: null,
      phone: "11999999999",
      document: null,
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z")
    });

    await createCustomer(context, {
      name: "Maria",
      phone: "11999999999"
    });

    expect(mocks.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          name: "Maria",
          phone: "11999999999"
        })
      })
    );
  });

  it("updates customers using id and organizationId", async () => {
    mocks.customer.update.mockResolvedValueOnce({
      id: "customer-1",
      name: "Maria",
      email: null,
      phone: "11999999999",
      document: null,
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z")
    });

    await updateCustomer(context, "customer-1", {
      name: "Maria",
      phone: "11999999999"
    });

    expect(mocks.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_organizationId: {
            id: "customer-1",
            organizationId: "org-1"
          }
        }
      })
    );
  });
});
