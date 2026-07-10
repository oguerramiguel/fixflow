import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors/domain-error";
import {
  assertServiceOrderStatusTransition,
  canTransitionServiceOrderStatus,
  getAllowedNextServiceOrderStatuses
} from "@/domain/services/service-order-workflow";

describe("service order workflow", () => {
  it("allows the main service order flow", () => {
    expect(canTransitionServiceOrderStatus("RECEIVED", "IN_DIAGNOSIS")).toBe(
      true
    );
    expect(
      canTransitionServiceOrderStatus("WAITING_FOR_APPROVAL", "APPROVED")
    ).toBe(true);
    expect(canTransitionServiceOrderStatus("READY_FOR_PICKUP", "COMPLETED")).toBe(
      true
    );
  });

  it("allows cancellation only before final customer pickup states", () => {
    expect(getAllowedNextServiceOrderStatuses("APPROVED")).toContain(
      "CANCELLED"
    );
    expect(getAllowedNextServiceOrderStatuses("FINAL_TESTING")).not.toContain(
      "CANCELLED"
    );
    expect(getAllowedNextServiceOrderStatuses("COMPLETED")).toEqual([]);
  });

  it("rejects arbitrary status changes", () => {
    expect(() =>
      assertServiceOrderStatusTransition("RECEIVED", "COMPLETED")
    ).toThrow(DomainError);
  });
});
