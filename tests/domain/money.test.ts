import { describe, expect, it } from "vitest";
import {
  calculateQuoteItemSubtotal,
  calculateQuoteTotal,
  createMoneyDecimal,
  parseMoneyInput,
  parseQuantityInput,
  toCanonicalMoneyString
} from "@/domain/services/money";

describe("money parsing and calculations", () => {
  it.each([
    ["0", "0.00"],
    ["0.00", "0.00"],
    ["10", "10.00"],
    ["10.5", "10.50"],
    ["10.50", "10.50"],
    ["10,5", "10.50"],
    ["10,50", "10.50"]
  ])("accepts %s as canonical %s", (input, expected) => {
    const result = parseMoneyInput(input);

    expect(result.valid).toBe(true);
    expect(result.valid ? result.canonical : "").toBe(expected);
  });

  it.each([
    "",
    "-1",
    "+1",
    "1.234",
    "1,234,56",
    "1.000,00",
    "1,000.00",
    "1e3",
    "NaN",
    "Infinity",
    "10.999",
    " 10 00 "
  ])("rejects invalid money input %s", (input) => {
    expect(parseMoneyInput(input).valid).toBe(false);
  });

  it.each([
    ["1", 1],
    ["999", 999]
  ])("accepts integer quantity %s", (input, expected) => {
    const result = parseQuantityInput(input);

    expect(result.valid).toBe(true);
    expect(result.valid ? result.quantity : 0).toBe(expected);
  });

  it.each(["0", "1000", "1.5", "-1", "2abc", "1e2", "NaN"])(
    "rejects invalid quantity %s",
    (input) => {
      expect(parseQuantityInput(input).valid).toBe(false);
    }
  );

  it("calculates item subtotal with Decimal", () => {
    const subtotal = calculateQuoteItemSubtotal({
      unitPrice: createMoneyDecimal("10.50"),
      quantity: 3
    });

    expect(toCanonicalMoneyString(subtotal)).toBe("31.50");
  });

  it("calculates quote total from Decimal subtotals", () => {
    const total = calculateQuoteTotal([
      {
        unitPrice: createMoneyDecimal("10.00"),
        quantity: 2
      },
      {
        unitPrice: createMoneyDecimal("10.50"),
        quantity: 3
      },
      {
        unitPrice: createMoneyDecimal("0.00"),
        quantity: 1
      }
    ]);

    expect(toCanonicalMoneyString(total)).toBe("51.50");
  });
});
