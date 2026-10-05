import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/domain/errors/not-found-error";

const mocks = vi.hoisted(() => ({ context: vi.fn(), list: vi.fn(), details: vi.fn() }));
vi.mock("@/app/app/auth", () => ({ requireAuthenticatedContextOrRedirect: mocks.context }));
vi.mock("@/server/services/customer-service", () => ({ listCustomersForOrganization: mocks.list, getCustomerDetails: mocks.details }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));
import NewServiceOrderPage from "@/app/app/service-orders/new/page";

const context = { organizationId: "trusted-org", userId: "u1", role: "OWNER" };

describe("new service order picker", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.context.mockResolvedValue(context); });

  it("loads customer selection using only the session tenant", async () => {
    mocks.list.mockResolvedValue({ items: [], currentPage: 1, totalPages: 0 });
    const html = renderToStaticMarkup(await NewServiceOrderPage({ searchParams: Promise.resolve({ query: "Marcio", organizationId: "foreign-org" }) }));
    expect(mocks.list).toHaveBeenCalledWith(context, { query: "Marcio", page: undefined });
    expect(html).toContain("Nenhum cliente corresponde à busca");
    expect(html).toContain("/app/customers/new");
  });

  it("revalidates selected customer in the trusted tenant before showing equipment", async () => {
    mocks.details.mockResolvedValue({ id: "c1", name: "Marcio", equipment: [{ id: "e1", brand: "Dell", model: "Inspiron", serialNumber: "SN1" }] });
    const html = renderToStaticMarkup(await NewServiceOrderPage({ searchParams: Promise.resolve({ customerId: "c1", organizationId: "foreign-org" }) }));
    expect(mocks.details).toHaveBeenCalledWith(context, "c1");
    expect(html).toContain("/app/equipment/e1/service-orders/new");
    expect(html).toContain("Trocar cliente");
    expect(html).not.toContain("foreign-org");
  });

  it("does not render foreign or nonexistent customer equipment", async () => {
    mocks.details.mockRejectedValue(new NotFoundError("Cliente não encontrado."));
    await expect(NewServiceOrderPage({ searchParams: Promise.resolve({ customerId: "foreign-customer" }) })).rejects.toThrow("404");
    expect(mocks.details).toHaveBeenCalledWith(context, "foreign-customer");
  });

  it("provides the next action when the selected customer has no equipment", async () => {
    mocks.details.mockResolvedValue({ id: "c1", name: "Marcio", equipment: [] });
    const html = renderToStaticMarkup(await NewServiceOrderPage({ searchParams: Promise.resolve({ customerId: "c1" }) }));
    expect(html).toContain("Este cliente ainda não tem equipamentos");
    expect(html).toContain("/app/equipment/new?customerId=c1");
  });
});
