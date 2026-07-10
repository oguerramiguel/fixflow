import { EquipmentType } from "@prisma/client";

export const EQUIPMENT_BRAND_MAX_LENGTH = 100;
export const EQUIPMENT_MODEL_MAX_LENGTH = 120;
export const EQUIPMENT_SERIAL_NUMBER_MAX_LENGTH = 120;
export const EQUIPMENT_ACCESSORIES_MAX_LENGTH = 500;
export const EQUIPMENT_NOTES_MAX_LENGTH = 2000;
export const RESOURCE_ID_MAX_LENGTH = 128;

export type EquipmentField =
  | "customerId"
  | "type"
  | "brand"
  | "model"
  | "serialNumber"
  | "accessories"
  | "notes";

export type EquipmentCreateInput = {
  customerId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  accessories?: string;
  notes?: string;
};

export type EquipmentUpdateInput = {
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  accessories?: string;
  notes?: string;
};

export type ValidatedEquipmentCreateInput = {
  customerId: string;
  type: EquipmentType;
  brand: string;
  model: string;
  serialNumber?: string;
  accessories?: string;
  notes?: string;
};

export type ValidatedEquipmentUpdateInput = Omit<
  ValidatedEquipmentCreateInput,
  "customerId"
>;

export type EquipmentValidationResult<TData> =
  | {
      valid: true;
      data: TData;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<EquipmentField, string>>;
    };

const resourceIdPattern = /^[A-Za-z0-9_-]+$/;
const equipmentTypes = Object.values(EquipmentType);

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue || undefined;
}

function validateResourceId(
  value: string,
  fieldErrors: Partial<Record<EquipmentField, string>>
): string {
  const customerId = value.trim();

  if (!customerId) {
    fieldErrors.customerId = "Cliente e obrigatorio.";
  } else if (
    customerId.length > RESOURCE_ID_MAX_LENGTH ||
    !resourceIdPattern.test(customerId)
  ) {
    fieldErrors.customerId = "Cliente informado e invalido.";
  }

  return customerId;
}

function validateType(
  value: string,
  fieldErrors: Partial<Record<EquipmentField, string>>
): EquipmentType {
  if (equipmentTypes.includes(value as EquipmentType)) {
    return value as EquipmentType;
  }

  fieldErrors.type = "Tipo de equipamento invalido.";
  return EquipmentType.OTHER;
}

function validateRequiredText(
  value: string,
  field: "brand" | "model",
  label: string,
  maxLength: number,
  fieldErrors: Partial<Record<EquipmentField, string>>
): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    fieldErrors[field] = `${label} e obrigatorio.`;
  } else if (trimmedValue.length > maxLength) {
    fieldErrors[field] = `${label} deve ter no maximo ${maxLength} caracteres.`;
  }

  return trimmedValue;
}

function validateOptionalText(
  value: string | undefined,
  field: "serialNumber" | "accessories" | "notes",
  label: string,
  maxLength: number,
  fieldErrors: Partial<Record<EquipmentField, string>>
): string | undefined {
  const normalizedValue = normalizeOptionalText(value);

  if (normalizedValue && normalizedValue.length > maxLength) {
    fieldErrors[field] = `${label} deve ter no maximo ${maxLength} caracteres.`;
  }

  return normalizedValue;
}

function validateSharedEquipmentInput(
  input: EquipmentUpdateInput,
  fieldErrors: Partial<Record<EquipmentField, string>>
): ValidatedEquipmentUpdateInput {
  return {
    type: validateType(input.type, fieldErrors),
    brand: validateRequiredText(
      input.brand,
      "brand",
      "Marca",
      EQUIPMENT_BRAND_MAX_LENGTH,
      fieldErrors
    ),
    model: validateRequiredText(
      input.model,
      "model",
      "Modelo",
      EQUIPMENT_MODEL_MAX_LENGTH,
      fieldErrors
    ),
    serialNumber: validateOptionalText(
      input.serialNumber,
      "serialNumber",
      "Numero de serie",
      EQUIPMENT_SERIAL_NUMBER_MAX_LENGTH,
      fieldErrors
    ),
    accessories: validateOptionalText(
      input.accessories,
      "accessories",
      "Acessorios",
      EQUIPMENT_ACCESSORIES_MAX_LENGTH,
      fieldErrors
    ),
    notes: validateOptionalText(
      input.notes,
      "notes",
      "Observacoes",
      EQUIPMENT_NOTES_MAX_LENGTH,
      fieldErrors
    )
  };
}

export function validateEquipmentCreateInput(
  input: EquipmentCreateInput
): EquipmentValidationResult<ValidatedEquipmentCreateInput> {
  const fieldErrors: Partial<Record<EquipmentField, string>> = {};
  const customerId = validateResourceId(input.customerId, fieldErrors);
  const sharedData = validateSharedEquipmentInput(input, fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: {
      customerId,
      ...sharedData
    }
  };
}

export function validateEquipmentUpdateInput(
  input: EquipmentUpdateInput
): EquipmentValidationResult<ValidatedEquipmentUpdateInput> {
  const fieldErrors: Partial<Record<EquipmentField, string>> = {};
  const sharedData = validateSharedEquipmentInput(input, fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: sharedData
  };
}
