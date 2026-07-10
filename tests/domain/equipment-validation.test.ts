import { EquipmentType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_NOTES_MAX_LENGTH,
  validateEquipmentCreateInput
} from "@/domain/services/equipment-validation";

const validInput = {
  customerId: "customer-1",
  type: EquipmentType.NOTEBOOK,
  brand: "Dell",
  model: "Latitude 5420",
  serialNumber: "SN123",
  accessories: "",
  notes: ""
};

describe("equipment validation", () => {
  it("accepts a valid EquipmentType", () => {
    const result = validateEquipmentCreateInput(validInput);

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.type : "").toBe(EquipmentType.NOTEBOOK);
  });

  it("rejects an invalid EquipmentType", () => {
    const result = validateEquipmentCreateInput({
      ...validInput,
      type: "INVALID"
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.type).toBeDefined();
  });

  it("trims the brand", () => {
    const result = validateEquipmentCreateInput({
      ...validInput,
      brand: "  Lenovo  "
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.brand : "").toBe("Lenovo");
  });

  it("requires the model", () => {
    const result = validateEquipmentCreateInput({
      ...validInput,
      model: " "
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.model).toBeDefined();
  });

  it("normalizes an empty serial number to absence", () => {
    const result = validateEquipmentCreateInput({
      ...validInput,
      serialNumber: "   "
    });

    expect(result.valid).toBe(true);
    expect(
      result.valid ? result.data.serialNumber : "unexpected"
    ).toBeUndefined();
  });

  it("rejects notes above the maximum length", () => {
    const result = validateEquipmentCreateInput({
      ...validInput,
      notes: "A".repeat(EQUIPMENT_NOTES_MAX_LENGTH + 1)
    });

    expect(result.valid).toBe(false);
    expect(result.valid ? undefined : result.fieldErrors.notes).toBeDefined();
  });
});
