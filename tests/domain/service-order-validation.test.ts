import { describe, expect, it } from "vitest";
import {
  SERVICE_ORDER_REPORTED_ISSUE_MAX_LENGTH,
  validateRequiredServiceOrderStatusInput,
  validateServiceOrderCreateInput,
  validateServiceOrderStatusInput
} from "@/domain/services/service-order-validation";

describe("service order validation", () => {
  it("trims a valid reported issue", () => {
    const result = validateServiceOrderCreateInput({
      equipmentId: "equipment-1",
      reportedIssue: "  Cliente relata tela apagando.  "
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.reportedIssue : "").toBe(
      "Cliente relata tela apagando."
    );
  });

  it("requires a reported issue", () => {
    const result = validateServiceOrderCreateInput({
      equipmentId: "equipment-1",
      reportedIssue: "   "
    });

    expect(result.valid).toBe(false);
    expect(
      result.valid ? undefined : result.fieldErrors.reportedIssue
    ).toBe("Descreva o problema relatado pelo cliente.");
  });

  it("rejects a reported issue below the minimum length", () => {
    const result = validateServiceOrderCreateInput({
      equipmentId: "equipment-1",
      reportedIssue: "abc"
    });

    expect(result.valid).toBe(false);
    expect(
      result.valid ? undefined : result.fieldErrors.reportedIssue
    ).toBeDefined();
  });

  it("rejects a reported issue above the maximum length", () => {
    const result = validateServiceOrderCreateInput({
      equipmentId: "equipment-1",
      reportedIssue: "A".repeat(SERVICE_ORDER_REPORTED_ISSUE_MAX_LENGTH + 1)
    });

    expect(result.valid).toBe(false);
    expect(
      result.valid ? undefined : result.fieldErrors.reportedIssue
    ).toBeDefined();
  });

  it("accepts an empty optional status filter", () => {
    const result = validateServiceOrderStatusInput("");

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data : "unexpected").toBeUndefined();
  });

  it("rejects an invalid status filter", () => {
    const result = validateServiceOrderStatusInput("INVALID");

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.status).toBeDefined();
  });

  it("requires transition status to be a ServiceOrderStatus", () => {
    expect(validateRequiredServiceOrderStatusInput("IN_DIAGNOSIS").valid).toBe(
      true
    );
    expect(validateRequiredServiceOrderStatusInput("INVALID").valid).toBe(false);
  });
});
