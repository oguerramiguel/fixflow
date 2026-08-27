import { UserRole } from "@prisma/client";
import {
  validateInviteUserInput,
  type UserManagementField
} from "@/domain/services/user-management-validation";

export const ORGANIZATION_NAME_MIN_LENGTH = 2;
export const ORGANIZATION_NAME_MAX_LENGTH = 120;
export const ORGANIZATION_SLUG_MIN_LENGTH = 3;
export const ORGANIZATION_SLUG_MAX_LENGTH = 63;

export type PilotProvisioningField =
  | "organizationName"
  | "organizationSlug"
  | "ownerName"
  | "ownerEmail";

export type PilotProvisioningInput = {
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  ownerEmail: string;
};

export type ValidatedPilotProvisioningInput = PilotProvisioningInput;

export type PilotProvisioningValidationResult =
  | {
      valid: true;
      data: ValidatedPilotProvisioningInput;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<PilotProvisioningField, string>>;
    };

const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function mapOwnerFieldErrors(
  fieldErrors: Partial<Record<UserManagementField, string>>
): Partial<Record<PilotProvisioningField, string>> {
  return {
    ...(fieldErrors.name ? { ownerName: fieldErrors.name } : {}),
    ...(fieldErrors.email ? { ownerEmail: fieldErrors.email } : {})
  };
}

export function validatePilotProvisioningInput(
  input: PilotProvisioningInput
): PilotProvisioningValidationResult {
  const organizationName = input.organizationName.trim();
  const organizationSlug = input.organizationSlug.trim();
  const fieldErrors: Partial<Record<PilotProvisioningField, string>> = {};

  if (organizationName.length < ORGANIZATION_NAME_MIN_LENGTH) {
    fieldErrors.organizationName =
      `Nome da empresa deve ter pelo menos ${ORGANIZATION_NAME_MIN_LENGTH} caracteres.`;
  } else if (organizationName.length > ORGANIZATION_NAME_MAX_LENGTH) {
    fieldErrors.organizationName =
      `Nome da empresa deve ter no maximo ${ORGANIZATION_NAME_MAX_LENGTH} caracteres.`;
  }

  if (organizationSlug.length < ORGANIZATION_SLUG_MIN_LENGTH) {
    fieldErrors.organizationSlug =
      `Slug deve ter pelo menos ${ORGANIZATION_SLUG_MIN_LENGTH} caracteres.`;
  } else if (organizationSlug.length > ORGANIZATION_SLUG_MAX_LENGTH) {
    fieldErrors.organizationSlug =
      `Slug deve ter no maximo ${ORGANIZATION_SLUG_MAX_LENGTH} caracteres.`;
  } else if (!organizationSlugPattern.test(organizationSlug)) {
    fieldErrors.organizationSlug =
      "Slug deve usar apenas letras minusculas, numeros e hifens entre palavras.";
  }

  const ownerValidation = validateInviteUserInput({
    name: input.ownerName,
    email: input.ownerEmail,
    role: UserRole.OWNER
  });

  if (!ownerValidation.valid) {
    Object.assign(fieldErrors, mapOwnerFieldErrors(ownerValidation.fieldErrors));
  }

  if (Object.keys(fieldErrors).length > 0 || !ownerValidation.valid) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: {
      organizationName,
      organizationSlug,
      ownerName: ownerValidation.data.name,
      ownerEmail: ownerValidation.data.email
    }
  };
}
