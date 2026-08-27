import { ConflictError } from "@/domain/errors/conflict-error";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  validatePilotProvisioningInput,
  type PilotProvisioningField,
  type PilotProvisioningInput,
  type ValidatedPilotProvisioningInput
} from "@/domain/services/pilot-provisioning-validation";
import {
  calculateAccountSetupExpiresAt,
  createAccountSetupToken,
  hashAccountSetupToken
} from "@/server/auth/account-setup-token";
import {
  createPilotOrganizationWithOwnerInvitation,
  findPilotProvisioningConflicts,
  PilotProvisioningConflictError,
  type PilotProvisioningConflict,
  type PilotProvisioningRecord,
  type PilotProvisioningRecordInput
} from "@/server/repositories/pilot-provisioning-repository";

export const PILOT_ORGANIZATION_SLUG_CONFLICT_MESSAGE =
  "Ja existe uma empresa com o slug informado.";
export const PILOT_OWNER_EMAIL_CONFLICT_MESSAGE =
  "Ja existe um usuario com o email informado.";

export type PilotProvisioningResult = {
  dryRun: boolean;
  organization: {
    id: string | null;
    name: string;
    slug: string;
  };
  owner: {
    id: string | null;
    name: string;
    email: string;
  };
  setupPath: string | null;
  expiresAt: Date | null;
};

export type PilotProvisioningServiceDependencies = {
  findConflicts(
    input: Pick<PilotProvisioningRecordInput, "organizationSlug" | "ownerEmail">
  ): Promise<PilotProvisioningConflict[]>;
  createRecord(
    input: PilotProvisioningRecordInput
  ): Promise<PilotProvisioningRecord>;
  createToken(): string;
  hashToken(token: string): string;
  calculateExpiresAt(now: Date): Date;
};

const defaultPilotProvisioningServiceDependencies: PilotProvisioningServiceDependencies =
  {
    findConflicts: findPilotProvisioningConflicts,
    createRecord: createPilotOrganizationWithOwnerInvitation,
    createToken: createAccountSetupToken,
    hashToken: hashAccountSetupToken,
    calculateExpiresAt: calculateAccountSetupExpiresAt
  };

function createValidationError(
  fieldErrors: Partial<Record<PilotProvisioningField, string>>
): ValidationError<PilotProvisioningField> {
  return new ValidationError("Dados de provisionamento invalidos.", fieldErrors);
}

function throwConflict(conflict: PilotProvisioningConflict): never {
  if (conflict === "organization_slug") {
    throw new ConflictError(PILOT_ORGANIZATION_SLUG_CONFLICT_MESSAGE);
  }

  throw new ConflictError(PILOT_OWNER_EMAIL_CONFLICT_MESSAGE);
}

function createDryRunResult(
  input: ValidatedPilotProvisioningInput
): PilotProvisioningResult {
  return {
    dryRun: true,
    organization: {
      id: null,
      name: input.organizationName,
      slug: input.organizationSlug
    },
    owner: {
      id: null,
      name: input.ownerName,
      email: input.ownerEmail
    },
    setupPath: null,
    expiresAt: null
  };
}

export async function provisionPilotOrganization(
  input: PilotProvisioningInput,
  options: {
    dryRun: boolean;
  },
  dependencies = defaultPilotProvisioningServiceDependencies,
  now = new Date()
): Promise<PilotProvisioningResult> {
  const validation = validatePilotProvisioningInput(input);

  if (!validation.valid) {
    throw createValidationError(validation.fieldErrors);
  }

  if (options.dryRun) {
    const conflicts = await dependencies.findConflicts(validation.data);

    if (conflicts[0]) {
      throwConflict(conflicts[0]);
    }

    return createDryRunResult(validation.data);
  }

  const token = dependencies.createToken();
  const expiresAt = dependencies.calculateExpiresAt(now);

  try {
    const record = await dependencies.createRecord({
      ...validation.data,
      tokenHash: dependencies.hashToken(token),
      expiresAt
    });

    return {
      dryRun: false,
      organization: {
        id: record.organizationId,
        name: validation.data.organizationName,
        slug: validation.data.organizationSlug
      },
      owner: {
        id: record.ownerUserId,
        name: validation.data.ownerName,
        email: validation.data.ownerEmail
      },
      setupPath: `/setup-account/${token}`,
      expiresAt
    };
  } catch (error) {
    if (error instanceof PilotProvisioningConflictError) {
      throwConflict(error.conflict);
    }

    throw error;
  }
}
