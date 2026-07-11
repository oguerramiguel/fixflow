import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors/domain-error";
import {
  assertQuoteStatusTransition,
  canTransitionQuoteStatus
} from "@/domain/services/quote-workflow";

describe("quote workflow", () => {
  it("allows the quote lifecycle transitions", () => {
    expect(canTransitionQuoteStatus("DRAFT", "SENT")).toBe(true);
    expect(canTransitionQuoteStatus("SENT", "APPROVED")).toBe(true);
    expect(canTransitionQuoteStatus("SENT", "REJECTED")).toBe(true);
  });

  it("rejects invalid and terminal transitions", () => {
    expect(() => assertQuoteStatusTransition("DRAFT", "APPROVED")).toThrow(
      DomainError
    );
    expect(() => assertQuoteStatusTransition("DRAFT", "REJECTED")).toThrow(
      DomainError
    );
    expect(() => assertQuoteStatusTransition("SENT", "DRAFT")).toThrow(
      DomainError
    );
    expect(() => assertQuoteStatusTransition("APPROVED", "SENT")).toThrow(
      DomainError
    );
    expect(() => assertQuoteStatusTransition("REJECTED", "SENT")).toThrow(
      DomainError
    );
    expect(() => assertQuoteStatusTransition("SENT", "SENT")).toThrow(
      DomainError
    );
  });
});
