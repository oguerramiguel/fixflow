import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/domain/services/email";

describe("email normalization", () => {
  it("removes external spaces", () => {
    expect(normalizeEmail("  owner@example.com  ")).toBe(
      "owner@example.com"
    );
  });

  it("converts email to lowercase", () => {
    expect(normalizeEmail("Owner@Example.COM")).toBe("owner@example.com");
  });
});
