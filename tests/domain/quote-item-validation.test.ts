import { describe, expect, it } from "vitest";
import {
  QUOTE_ITEM_DESCRIPTION_MAX_LENGTH,
  validateQuoteItemInput
} from "@/domain/services/quote-item-validation";
import { toCanonicalMoneyString } from "@/domain/services/money";

describe("quote item validation", () => {
  it("validates and trims a quote item", () => {
    const result = validateQuoteItemInput({
      description: "  Limpeza interna  ",
      quantity: "2",
      unitPrice: "100,50"
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.description : "").toBe("Limpeza interna");
    expect(result.valid ? result.data.quantity : 0).toBe(2);
    expect(
      result.valid ? toCanonicalMoneyString(result.data.unitPrice) : ""
    ).toBe("100.50");
  });

  it("rejects invalid description, quantity and money fields", () => {
    const result = validateQuoteItemInput({
      description: "A",
      quantity: "2abc",
      unitPrice: "10.999"
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.description).toBeDefined();
    expect(result.valid ? undefined : result.fieldErrors.quantity).toBeDefined();
    expect(result.valid ? undefined : result.fieldErrors.unitPrice).toBeDefined();
  });

  it("rejects oversized descriptions and subtotal overflow", () => {
    expect(
      validateQuoteItemInput({
        description: "A".repeat(QUOTE_ITEM_DESCRIPTION_MAX_LENGTH + 1),
        quantity: "1",
        unitPrice: "10.00"
      }).valid
    ).toBe(false);

    const overflow = validateQuoteItemInput({
      description: "Troca completa",
      quantity: "999",
      unitPrice: "9999999999.99"
    });

    expect(overflow.valid).toBe(false);
    expect(overflow.valid ? undefined : overflow.fieldErrors.unitPrice).toBe(
      "O subtotal do item ultrapassa o limite permitido."
    );
  });
});
