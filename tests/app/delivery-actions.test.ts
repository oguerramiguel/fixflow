import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/errors/validation-error";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  requireAuthenticatedContext: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/server/auth/authenticated-context", () => ({
  requireAuthenticatedContext: mocks.requireAuthenticatedContext
}));

vi.mock("@/server/services/customer-service", () => ({
  createCustomer: mocks.createCustomer,
  updateCustomer: mocks.updateCustomer
}));

vi.mock("@/server/services/equipment-service", () => ({
  createEquipment: mocks.createEquipment,
  updateEquipment: mocks.updateEquipment
}));

import { createCustomerAction } from "@/app/app/customers/actions";
import {
  createEquipmentAction,
  updateEquipmentAction
} from "@/app/app/equipment/actions";

const context = {
  userId: "user-1",
  organizationId: "org-from-session",
  role: "OWNER"
};

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("delivery actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedContext.mockResolvedValue(context);
  });

  it("creates a customer using authenticated context and not FormData organizationId", async () => {
    mocks.createCustomer.mockResolvedValueOnce({
      id: "customer-1"
    });

    await expect(
      createCustomerAction(
        {},
        createFormData({
          name: "Maria",
          email: "",
          phone: "11999999999",
          document: "",
          organizationId: "org-from-browser"
        })
      )
    ).rejects.toThrow("redirect:/app/customers/customer-1");

    expect(mocks.requireAuthenticatedContext).toHaveBeenCalledTimes(1);
    expect(mocks.createCustomer).toHaveBeenCalledWith(
      context,
      expect.not.objectContaining({
        organizationId: expect.any(String)
      })
    );
  });

  it("returns safe validation feedback from customer creation", async () => {
    mocks.createCustomer.mockRejectedValueOnce(
      new ValidationError("Dados do cliente invalidos.", {
        name: "Nome invalido."
      })
    );

    const result = await createCustomerAction(
      {},
      createFormData({
        name: "A",
        email: "",
        phone: "",
        document: ""
      })
    );

    expect(result).toEqual({
      error: "Dados do cliente invalidos.",
      fieldErrors: {
        name: "Nome invalido."
      },
      values: {
        name: "A",
        email: "",
        phone: "",
        document: ""
      }
    });
  });

  it("creates equipment using authenticated context and validated customerId", async () => {
    mocks.createEquipment.mockResolvedValueOnce({
      id: "equipment-1"
    });

    await expect(
      createEquipmentAction(
        {},
        createFormData({
          customerId: "customer-1",
          type: "NOTEBOOK",
          brand: "Dell",
          model: "Latitude",
          serialNumber: "",
          accessories: "",
          notes: "",
          organizationId: "org-from-browser"
        })
      )
    ).rejects.toThrow("redirect:/app/equipment/equipment-1");

    expect(mocks.createEquipment).toHaveBeenCalledWith(
      context,
      expect.not.objectContaining({
        organizationId: expect.any(String)
      })
    );
    expect(mocks.createEquipment).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        customerId: "customer-1"
      })
    );
  });

  it("updates equipment without accepting customerId or organizationId from FormData", async () => {
    mocks.updateEquipment.mockResolvedValueOnce({
      id: "equipment-1"
    });

    await expect(
      updateEquipmentAction(
        "equipment-1",
        {},
        createFormData({
          customerId: "customer-2",
          type: "DESKTOP",
          brand: "Lenovo",
          model: "ThinkCentre",
          serialNumber: "",
          accessories: "",
          notes: "",
          organizationId: "org-from-browser"
        })
      )
    ).rejects.toThrow("redirect:/app/equipment/equipment-1");

    expect(mocks.updateEquipment).toHaveBeenCalledWith(
      context,
      "equipment-1",
      expect.not.objectContaining({
        customerId: expect.any(String),
        organizationId: expect.any(String)
      })
    );
  });
});
