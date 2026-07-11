import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { NotFoundError } from "@/domain/errors/not-found-error";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  revalidatePath: vi.fn(),
  requireAuthenticatedContext: vi.fn(),
  approvePublicQuote: vi.fn(),
  rejectPublicQuote: vi.fn()
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

vi.mock("@/server/services/public-tracking-service", () => ({
  approvePublicQuote: mocks.approvePublicQuote,
  rejectPublicQuote: mocks.rejectPublicQuote
}));

import {
  approvePublicQuoteAction,
  rejectPublicQuoteAction
} from "@/app/track/[publicCode]/actions";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("public tracking actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves quote using route publicCode without authenticated context or browser ids", async () => {
    mocks.approvePublicQuote.mockResolvedValueOnce(undefined);

    await expect(
      approvePublicQuoteAction(
        "FF-ABCDEFG234",
        {},
        createFormData({
          organizationId: "org-from-browser",
          serviceOrderId: "service-order-from-browser",
          quoteId: "quote-from-browser",
          currentQuoteStatus: "SENT",
          total: "999.99"
        })
      )
    ).rejects.toThrow("redirect:/track/FF-ABCDEFG234");

    expect(mocks.requireAuthenticatedContext).not.toHaveBeenCalled();
    expect(mocks.approvePublicQuote).toHaveBeenCalledWith("FF-ABCDEFG234");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/track/FF-ABCDEFG234");
  });

  it("rejects quote using route publicCode and ignores FormData ids", async () => {
    mocks.rejectPublicQuote.mockResolvedValueOnce(undefined);

    await expect(
      rejectPublicQuoteAction(
        "FF-ABCDEFG234",
        {},
        createFormData({
          serviceOrderId: "service-order-from-browser",
          quoteId: "quote-from-browser",
          status: "WAITING_FOR_APPROVAL"
        })
      )
    ).rejects.toThrow("redirect:/track/FF-ABCDEFG234");

    expect(mocks.rejectPublicQuote).toHaveBeenCalledWith("FF-ABCDEFG234");
  });

  it("normalizes redirect path after successful public decision", async () => {
    mocks.approvePublicQuote.mockResolvedValueOnce(undefined);

    await expect(
      approvePublicQuoteAction("ff-abcdefg234", {}, createFormData({}))
    ).rejects.toThrow("redirect:/track/FF-ABCDEFG234");

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/track/FF-ABCDEFG234");
  });

  it("returns safe public errors for NotFound and Conflict", async () => {
    mocks.approvePublicQuote.mockRejectedValueOnce(
      new NotFoundError("Ordem de servico nao encontrada.")
    );
    mocks.rejectPublicQuote.mockRejectedValueOnce(
      new ConflictError("Este orcamento ja foi atualizado. Recarregue a pagina.")
    );

    await expect(
      approvePublicQuoteAction("FF-ABCDEFG234", {}, createFormData({}))
    ).resolves.toEqual({
      error: "Ordem de servico nao encontrada."
    });
    await expect(
      rejectPublicQuoteAction("FF-ABCDEFG234", {}, createFormData({}))
    ).resolves.toEqual({
      error: "Este orcamento ja foi atualizado. Recarregue a pagina."
    });
  });

  it("does not treat internal authorization errors as public success", async () => {
    mocks.approvePublicQuote.mockRejectedValueOnce(new AuthorizationError());

    await expect(
      approvePublicQuoteAction("FF-ABCDEFG234", {}, createFormData({}))
    ).resolves.toEqual({
      error: "Nao foi possivel registrar a decisao do orcamento."
    });

    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
