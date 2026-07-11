import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors/domain-error";
import {
  assertServiceOrderStatusTransition,
  canTransitionServiceOrderStatus,
  getAllowedNextServiceOrderStatuses
} from "@/domain/services/service-order-workflow";

describe("service order workflow", () => {
  it("allows the main service order flow", () => {
    const mainFlow = [
      ["RECEIVED", "IN_DIAGNOSIS"],
      ["IN_DIAGNOSIS", "WAITING_FOR_APPROVAL"],
      ["WAITING_FOR_APPROVAL", "APPROVED"],
      ["APPROVED", "IN_REPAIR"],
      ["IN_REPAIR", "FINAL_TESTING"],
      ["FINAL_TESTING", "READY_FOR_PICKUP"],
      ["READY_FOR_PICKUP", "COMPLETED"]
    ] as const;

    for (const [currentStatus, nextStatus] of mainFlow) {
      expect(canTransitionServiceOrderStatus(currentStatus, nextStatus)).toBe(
        true
      );
    }
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

  it("rejects transitions to the same status", () => {
    expect(() =>
      assertServiceOrderStatusTransition("RECEIVED", "RECEIVED")
    ).toThrow(DomainError);
  });

  it("keeps completed and cancelled as terminal statuses", () => {
    expect(getAllowedNextServiceOrderStatuses("COMPLETED")).toEqual([]);
    expect(getAllowedNextServiceOrderStatuses("CANCELLED")).toEqual([]);
  });
});
