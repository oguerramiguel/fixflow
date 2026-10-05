import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/domain/errors/not-found-error";

const mocks = vi.hoisted(() => ({ context: vi.fn(), details: vi.fn(), config: vi.fn() }));
vi.mock("@/app/app/auth", () => ({ requireAuthenticatedContextOrRedirect: mocks.context }));
vi.mock("@/server/services/service-order-service", () => ({ getServiceOrderDetails: mocks.details }));
vi.mock("@/server/runtime/runtime-config", () => ({ getRuntimeConfig: mocks.config }));
vi.mock("@/app/app/service-orders/actions", () => ({ transitionServiceOrderStatusAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));
import ServiceOrderDetailsPage from "@/app/app/service-orders/[serviceOrderId]/page";

const context = { organizationId: "trusted-org", userId: "owner", role: "OWNER" };
const order = {
  id: "internal-order-id", publicCode: "FF-PUBLIC123", status: "COMPLETED",
  createdAt: new Date("2026-09-07T12:00:00Z"), updatedAt: new Date("2026-09-07T12:00:00Z"),
  allowedNextStatuses: [], reportedIssue: "Does not turn on", diagnostic: null, quote: null, timeline: [],
  customer: { id: "internal-customer-id", name: "Customer", phone: "11999999999" },
  equipment: { id: "internal-equipment-id", brand: "Dell", model: "Inspiron", type: "NOTEBOOK" }
};

describe("service order public link", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.context.mockResolvedValue(context);
    mocks.details.mockResolvedValue(order);
  });

  it.each(["https://fixflow.example", "http://localhost:3100/"])("uses the configured application base %s and only the existing public code", async (base) => {
    mocks.config.mockReturnValue({ appBaseUrl: new URL(base) });
    const html = renderToStaticMarkup(await ServiceOrderDetailsPage({ params: Promise.resolve({ serviceOrderId: order.id }) }));
    const panel = html.match(/<section[^>]*aria-labelledby="public-link-title"[\s\S]*?<\/section>/)?.[0];
    expect(panel).toContain(new URL("/track/FF-PUBLIC123", base).toString());
    expect(panel).toContain("Copiar link");
    expect(panel).not.toContain("internal-");
    expect(panel).not.toContain("trusted-org");
    expect(mocks.details).toHaveBeenCalledWith(context, order.id);
  });

  it("does not produce a public link for an order outside the authenticated tenant", async () => {
    mocks.details.mockRejectedValue(new NotFoundError("Ordem não encontrada."));
    await expect(ServiceOrderDetailsPage({ params: Promise.resolve({ serviceOrderId: "foreign-order" }) })).rejects.toThrow("404");
    expect(mocks.config).not.toHaveBeenCalled();
  });
});
