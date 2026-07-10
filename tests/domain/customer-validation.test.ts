import { describe, expect, it } from "vitest";
import {
  CUSTOMER_NAME_MAX_LENGTH,
  validateCustomerInput
} from "@/domain/services/customer-validation";

describe("customer validation", () => {
  it("trims the customer name", () => {
    const result = validateCustomerInput({
      name: "  Maria Silva  ",
      email: "",
      phone: "11999999999",
      document: ""
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.name : "").toBe("Maria Silva");
  });

  it("rejects a short name", () => {
    const result = validateCustomerInput({
      name: "A",
      email: "",
      phone: "11999999999",
      document: ""
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.name).toBeDefined();
  });

  it("rejects a name above the maximum length", () => {
    const result = validateCustomerInput({
      name: "A".repeat(CUSTOMER_NAME_MAX_LENGTH + 1),
      email: "",
      phone: "11999999999",
      document: ""
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.name).toBeDefined();
  });

  it("normalizes an empty email to absence", () => {
    const result = validateCustomerInput({
      name: "Maria Silva",
      email: "   ",
      phone: "11999999999",
      document: ""
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.email : "unexpected").toBeUndefined();
  });

  it("normalizes an informed email", () => {
    const result = validateCustomerInput({
      name: "Maria Silva",
      email: "  MARIA@EXAMPLE.COM ",
      phone: "11999999999",
      document: ""
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.email : "").toBe("maria@example.com");
  });

  it("rejects an invalid email", () => {
    const result = validateCustomerInput({
      name: "Maria Silva",
      email: "invalid-email",
      phone: "11999999999",
      document: ""
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.email).toBeDefined();
  });

  it("requires a phone", () => {
    const result = validateCustomerInput({
      name: "Maria Silva",
      email: "",
      phone: "",
      document: ""
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.phone).toBeDefined();
  });

  it("normalizes an empty document to absence", () => {
    const result = validateCustomerInput({
      name: "Maria Silva",
      email: "",
      phone: "11999999999",
      document: "   "
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.document : "unexpected").toBeUndefined();
  });
});
