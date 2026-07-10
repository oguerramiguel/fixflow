import { describe, expect, it } from "vitest";
import {
  createServiceOrderPublicCode,
  isServiceOrderPublicCode
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
});
