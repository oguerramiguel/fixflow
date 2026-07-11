export const DIAGNOSTIC_DESCRIPTION_MIN_LENGTH = 10;
export const DIAGNOSTIC_DESCRIPTION_MAX_LENGTH = 4000;
export const DIAGNOSTIC_TECHNICAL_NOTES_MAX_LENGTH = 8000;

export type DiagnosticField = "description" | "technicalNotes";

export type DiagnosticInput = {
  description: string;
  technicalNotes?: string;
};

export type ValidatedDiagnosticInput = {
  description: string;
  technicalNotes?: string;
};

export type DiagnosticValidationResult =
  | {
      valid: true;
      data: ValidatedDiagnosticInput;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<DiagnosticField, string>>;
    };

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue || undefined;
}

export function validateDiagnosticInput(
  input: DiagnosticInput
): DiagnosticValidationResult {
  const description = input.description.trim();
  const technicalNotes = normalizeOptionalText(input.technicalNotes);
  const fieldErrors: Partial<Record<DiagnosticField, string>> = {};

  if (!description) {
    fieldErrors.description = "Informe o diagnostico tecnico.";
  } else if (description.length < DIAGNOSTIC_DESCRIPTION_MIN_LENGTH) {
    fieldErrors.description = `Diagnostico tecnico deve ter pelo menos ${DIAGNOSTIC_DESCRIPTION_MIN_LENGTH} caracteres.`;
  } else if (description.length > DIAGNOSTIC_DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = `Diagnostico tecnico deve ter no maximo ${DIAGNOSTIC_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  if (
    technicalNotes &&
    technicalNotes.length > DIAGNOSTIC_TECHNICAL_NOTES_MAX_LENGTH
  ) {
    fieldErrors.technicalNotes = `Notas tecnicas devem ter no maximo ${DIAGNOSTIC_TECHNICAL_NOTES_MAX_LENGTH} caracteres.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: {
      description,
      technicalNotes
    }
  };
}
