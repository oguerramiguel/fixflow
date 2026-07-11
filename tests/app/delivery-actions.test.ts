import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { ValidationError } from "@/domain/errors/validation-error";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  revalidatePath: vi.fn(),
  requireAuthenticatedContext: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  createServiceOrder: vi.fn(),
  transitionServiceOrderStatus: vi.fn(),
  saveDiagnosticForServiceOrder: vi.fn(),
  createQuoteForServiceOrder: vi.fn(),
  addQuoteItem: vi.fn(),
  updateQuoteItem: vi.fn(),
  removeQuoteItem: vi.fn(),
  sendQuote: vi.fn(),
  approveQuote: vi.fn(),
  rejectQuote: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
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

vi.mock("@/server/services/service-order-service", () => ({
  createServiceOrder: mocks.createServiceOrder,
  transitionServiceOrderStatus: mocks.transitionServiceOrderStatus
}));

vi.mock("@/server/services/diagnostic-service", () => ({
  saveDiagnosticForServiceOrder: mocks.saveDiagnosticForServiceOrder
}));

vi.mock("@/server/services/quote-service", () => ({
  createQuoteForServiceOrder: mocks.createQuoteForServiceOrder,
  addQuoteItem: mocks.addQuoteItem,
  updateQuoteItem: mocks.updateQuoteItem,
  removeQuoteItem: mocks.removeQuoteItem,
  sendQuote: mocks.sendQuote,
  approveQuote: mocks.approveQuote,
  rejectQuote: mocks.rejectQuote
}));

import { createCustomerAction } from "@/app/app/customers/actions";
import {
  createEquipmentAction,
  updateEquipmentAction
} from "@/app/app/equipment/actions";
import {
  createServiceOrderAction,
  transitionServiceOrderStatusAction
} from "@/app/app/service-orders/actions";
import { saveDiagnosticAction } from "@/app/app/service-orders/[serviceOrderId]/diagnostic/actions";
import {
  addQuoteItemAction,
  approveQuoteAction,
  createQuoteAction,
  rejectQuoteAction,
  removeQuoteItemAction,
  sendQuoteAction,
  updateQuoteItemAction
} from "@/app/app/service-orders/[serviceOrderId]/quote/actions";

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

  it("creates service order from route equipmentId without trusting FormData tenant fields", async () => {
    mocks.createServiceOrder.mockResolvedValueOnce({
      id: "service-order-1"
    });

    await expect(
      createServiceOrderAction(
        "equipment-from-route",
        {},
        createFormData({
          equipmentId: "equipment-from-browser",
          customerId: "customer-from-browser",
          organizationId: "org-from-browser",
          publicCode: "FF-BROWSER001",
          status: "COMPLETED",
          reportedIssue: "Tela apagando."
        })
      )
    ).rejects.toThrow("redirect:/app/service-orders/service-order-1");

    expect(mocks.requireAuthenticatedContext).toHaveBeenCalledTimes(1);
    expect(mocks.createServiceOrder).toHaveBeenCalledWith(context, {
      equipmentId: "equipment-from-route",
      reportedIssue: "Tela apagando."
    });
    expect(mocks.createServiceOrder).toHaveBeenCalledWith(
      context,
      expect.not.objectContaining({
        customerId: expect.any(String),
        organizationId: expect.any(String),
        publicCode: expect.any(String),
        status: expect.any(String)
      })
    );
  });

  it("returns safe validation feedback from service order creation", async () => {
    mocks.createServiceOrder.mockRejectedValueOnce(
      new ValidationError("Dados da ordem de servico invalidos.", {
        reportedIssue: "Descreva o problema relatado pelo cliente."
      })
    );

    const result = await createServiceOrderAction(
      "equipment-1",
      {},
      createFormData({
        reportedIssue: ""
      })
    );

    expect(result).toEqual({
      error: "Dados da ordem de servico invalidos.",
      fieldErrors: {
        reportedIssue: "Descreva o problema relatado pelo cliente."
      },
      values: {
        reportedIssue: ""
      }
    });
  });

  it("transitions service order status without trusting currentStatus or organizationId", async () => {
    mocks.transitionServiceOrderStatus.mockResolvedValueOnce({
      id: "service-order-1"
    });

    await expect(
      transitionServiceOrderStatusAction(
        "service-order-1",
        {},
        createFormData({
          targetStatus: "IN_DIAGNOSIS",
          currentStatus: "RECEIVED",
          organizationId: "org-from-browser",
          description: "browser controlled timeline"
        })
      )
    ).rejects.toThrow("redirect:/app/service-orders/service-order-1");

    expect(mocks.transitionServiceOrderStatus).toHaveBeenCalledWith(
      context,
      "service-order-1",
      "IN_DIAGNOSIS"
    );
  });

  it("returns safe conflict feedback from service order transition", async () => {
    mocks.transitionServiceOrderStatus.mockRejectedValueOnce(new ConflictError());

    const result = await transitionServiceOrderStatusAction(
      "service-order-1",
      {},
      createFormData({
        targetStatus: "IN_DIAGNOSIS",
        currentStatus: "RECEIVED"
      })
    );

    expect(result).toEqual({
      error:
        "A ordem de servico foi alterada por outra operacao. Atualize a pagina e tente novamente."
    });
  });

  it("does not treat authorization failure as success in service order transition", async () => {
    mocks.transitionServiceOrderStatus.mockRejectedValueOnce(
      new AuthorizationError()
    );

    const result = await transitionServiceOrderStatusAction(
      "service-order-1",
      {},
      createFormData({
        targetStatus: "CANCELLED"
      })
    );

    expect(result).toEqual({
      error: "Permissao insuficiente."
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("saves diagnostic using authenticated context and route serviceOrderId", async () => {
    mocks.saveDiagnosticForServiceOrder.mockResolvedValueOnce({
      id: "diagnostic-1"
    });

    await expect(
      saveDiagnosticAction(
        "service-order-from-route",
        {},
        createFormData({
          serviceOrderId: "service-order-from-browser",
          organizationId: "org-from-browser",
          status: "COMPLETED",
          type: "STATUS_CHANGED",
          description: "Diagnostico tecnico consistente.",
          technicalNotes: "Notas internas."
        })
      )
    ).rejects.toThrow(
      "redirect:/app/service-orders/service-order-from-route/diagnostic"
    );

    expect(mocks.saveDiagnosticForServiceOrder).toHaveBeenCalledWith(
      context,
      "service-order-from-route",
      {
        description: "Diagnostico tecnico consistente.",
        technicalNotes: "Notas internas."
      }
    );
  });

  it("creates quote without accepting commercial state from FormData", async () => {
    mocks.createQuoteForServiceOrder.mockResolvedValueOnce({
      id: "quote-1"
    });

    await expect(
      createQuoteAction(
        "service-order-1",
        {},
        createFormData({
          organizationId: "org-from-browser",
          role: "OWNER",
          status: "APPROVED",
          currentServiceOrderStatus: "IN_DIAGNOSIS"
        })
      )
    ).rejects.toThrow("redirect:/app/service-orders/service-order-1/quote");

    expect(mocks.createQuoteForServiceOrder).toHaveBeenCalledWith(
      context,
      "service-order-1"
    );
  });

  it("adds quote item keeping unitPrice as string and ignoring totals", async () => {
    mocks.addQuoteItem.mockResolvedValueOnce({
      id: "quote-1"
    });

    await expect(
      addQuoteItemAction(
        "service-order-1",
        {},
        createFormData({
          description: "Limpeza interna",
          quantity: "2",
          unitPrice: "100,50",
          subtotal: "200.00",
          total: "200.00",
          organizationId: "org-from-browser"
        })
      )
    ).rejects.toThrow("redirect:/app/service-orders/service-order-1/quote");

    expect(mocks.addQuoteItem).toHaveBeenCalledWith(context, "service-order-1", {
      description: "Limpeza interna",
      quantity: "2",
      unitPrice: "100,50"
    });
  });

  it("updates and removes quote items without accepting quoteId from FormData", async () => {
    mocks.updateQuoteItem.mockResolvedValueOnce({
      id: "quote-1"
    });
    mocks.removeQuoteItem.mockResolvedValueOnce({
      id: "quote-1"
    });

    await expect(
      updateQuoteItemAction(
        "service-order-1",
        "item-from-route",
        {},
        createFormData({
          quoteId: "quote-from-browser",
          organizationId: "org-from-browser",
          description: "Limpeza completa",
          quantity: "1",
          unitPrice: "120.00"
        })
      )
    ).rejects.toThrow("redirect:/app/service-orders/service-order-1/quote");

    await expect(
      removeQuoteItemAction(
        "service-order-1",
        "item-from-route",
        {},
        createFormData({
          quoteItemId: "item-from-browser",
          quoteId: "quote-from-browser",
          organizationId: "org-from-browser"
        })
      )
    ).rejects.toThrow("redirect:/app/service-orders/service-order-1/quote");

    expect(mocks.updateQuoteItem).toHaveBeenCalledWith(
      context,
      "service-order-1",
      "item-from-route",
      {
        description: "Limpeza completa",
        quantity: "1",
        unitPrice: "120.00"
      }
    );
    expect(mocks.removeQuoteItem).toHaveBeenCalledWith(
      context,
      "service-order-1",
      "item-from-route"
    );
  });

  it("runs quote lifecycle actions without trusting status or role FormData", async () => {
    mocks.sendQuote.mockResolvedValueOnce({
      id: "quote-1"
    });
    mocks.approveQuote.mockResolvedValueOnce({
      id: "quote-1"
    });
    mocks.rejectQuote.mockResolvedValueOnce({
      id: "quote-1"
    });

    for (const action of [sendQuoteAction, approveQuoteAction, rejectQuoteAction]) {
      await expect(
        action(
          "service-order-1",
          {},
          createFormData({
            organizationId: "org-from-browser",
            role: "OWNER",
            currentQuoteStatus: "SENT",
            currentServiceOrderStatus: "WAITING_FOR_APPROVAL",
            total: "999.99",
            description: "browser timeline"
          })
        )
      ).rejects.toThrow("redirect:/app/service-orders/service-order-1/quote");
    }

    expect(mocks.sendQuote).toHaveBeenCalledWith(context, "service-order-1");
    expect(mocks.approveQuote).toHaveBeenCalledWith(context, "service-order-1");
    expect(mocks.rejectQuote).toHaveBeenCalledWith(context, "service-order-1");
  });

  it("returns safe conflict and authorization feedback from quote actions", async () => {
    mocks.sendQuote.mockRejectedValueOnce(new ConflictError("quote conflict"));
    mocks.approveQuote.mockRejectedValueOnce(new AuthorizationError());

    await expect(
      sendQuoteAction("service-order-1", {}, createFormData({}))
    ).resolves.toEqual({
      error: "quote conflict"
    });
    await expect(
      approveQuoteAction("service-order-1", {}, createFormData({}))
    ).resolves.toEqual({
      error: "Permissao insuficiente."
    });
  });
});
