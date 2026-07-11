import { describe, expect, it } from "vitest";
import {
  createServiceOrderPublicCode,
  isServiceOrderPublicCode,
  normalizeServiceOrderPublicCode,
  SERVICE_ORDER_PUBLIC_CODE_TOTAL_LENGTH
} from "@/domain/services/public-code";

describe("service order public code", () => {
  it("creates a non-sequential public code with the expected format", () => {
    const publicCode = createServiceOrderPublicCode();

    expect(isServiceOrderPublicCode(publicCode)).toBe(true);
    expect(publicCode).toHaveLength(13);
  });

  it("rejects values outside the public tracking format", () => {
    expect(isServiceOrderPublicCode("1")).toBe(false);
    expect(isServiceOrderPublicCode("FF-123")).toBe(false);
    expect(isServiceOrderPublicCode("SO-ABCDEFG234")).toBe(false);
  });

  it("normalizes public code with trim and uppercase", () => {
    expect(normalizeServiceOrderPublicCode("  ff-abcdefg234  ")).toBe(
      "FF-ABCDEFG234"
    );
  });

  it("rejects invalid public code before a public query can run", () => {
    expect(normalizeServiceOrderPublicCode("service-order-1")).toBeNull();
    expect(normalizeServiceOrderPublicCode("FF-123")).toBeNull();
    expect(normalizeServiceOrderPublicCode("FF-ABCDE!G234")).toBeNull();
    expect(
      normalizeServiceOrderPublicCode(
        `FF-ABCDEFG234${"A".repeat(SERVICE_ORDER_PUBLIC_CODE_TOTAL_LENGTH)}`
      )
    ).toBeNull();
  });
});
