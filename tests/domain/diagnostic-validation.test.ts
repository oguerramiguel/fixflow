import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_DESCRIPTION_MAX_LENGTH,
  DIAGNOSTIC_TECHNICAL_NOTES_MAX_LENGTH,
  validateDiagnosticInput
} from "@/domain/services/diagnostic-validation";

describe("diagnostic validation", () => {
  it("trims valid diagnostic input", () => {
    const result = validateDiagnosticInput({
      description: "  Placa principal com curto no setor de entrada.  ",
      technicalNotes: "  Medido consumo assimetrico.  "
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.description : "").toBe(
      "Placa principal com curto no setor de entrada."
    );
    expect(result.valid ? result.data.technicalNotes : "").toBe(
      "Medido consumo assimetrico."
    );
  });

  it("rejects short or oversized descriptions", () => {
    expect(
      validateDiagnosticInput({
        description: "curto"
      }).valid
    ).toBe(false);
    expect(
      validateDiagnosticInput({
        description: "A".repeat(DIAGNOSTIC_DESCRIPTION_MAX_LENGTH + 1)
      }).valid
    ).toBe(false);
  });

  it("normalizes empty technical notes to absence", () => {
    const result = validateDiagnosticInput({
      description: "Fonte interna com oscilacao na linha de entrada.",
      technicalNotes: "   "
    });

    expect(result.valid).toBe(true);
    expect(result.valid ? result.data.technicalNotes : "unexpected").toBeUndefined();
  });

  it("rejects oversized technical notes", () => {
    const result = validateDiagnosticInput({
      description: "Fonte interna com oscilacao na linha de entrada.",
      technicalNotes: "A".repeat(DIAGNOSTIC_TECHNICAL_NOTES_MAX_LENGTH + 1)
    });

    expect(result.valid).toBe(false);
  });
});
