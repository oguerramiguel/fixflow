import { describe, expect, it } from "vitest";
import { getActionNotice } from "@/lib/action-notices";

describe("action feedback", () => {
  it("accepts only known message keys", () => {
    expect(getActionNotice("customer-created")).toContain("Cliente cadastrado");
    for (const value of [null, "", "<script>alert(1)</script>", "constructor", "__proto__"]) expect(getActionNotice(value)).toBeUndefined();
  });
  it("does not claim an automatic external message was sent", () => {
    expect(getActionNotice("quote-sent")).toBe("Orçamento disponibilizado no portal. Compartilhe o link com o cliente.");
  });
});
