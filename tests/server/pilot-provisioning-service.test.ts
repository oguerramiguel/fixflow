import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/errors/conflict-error";
import { ValidationError } from "@/domain/errors/validation-error";
import { PilotProvisioningConflictError } from "@/server/repositories/pilot-provisioning-repository";
import {
  PILOT_ORGANIZATION_SLUG_CONFLICT_MESSAGE,
  PILOT_OWNER_EMAIL_CONFLICT_MESSAGE,
  provisionPilotOrganization,
  type PilotProvisioningServiceDependencies
} from "@/server/services/pilot-provisioning-service";

const rawToken = "a".repeat(43);
const tokenHash = "b".repeat(64);
const now = new Date("2026-08-24T12:00:00.000Z");
const expiresAt = new Date("2026-08-27T12:00:00.000Z");
const input = {
  organizationName: "Pilot Company",
  organizationSlug: "pilot-company",
  ownerName: "Pilot Owner",
  ownerEmail: "owner@example.test"
};

function createDependencies(
  overrides: Partial<PilotProvisioningServiceDependencies> = {}
): PilotProvisioningServiceDependencies {
  return {
    findConflicts: vi.fn(async () => []),
    createRecord: vi.fn(async () => ({
      organizationId: "organization-1",
      ownerUserId: "owner-1"
    })),
    createToken: vi.fn(() => rawToken),
    hashToken: vi.fn(() => tokenHash),
    calculateExpiresAt: vi.fn(() => expiresAt),
    ...overrides
  };
}

describe("pilot provisioning service", () => {
  it("creates Organization, OWNER and invitation using only the token hash", async () => {
    const dependencies = createDependencies();
    const result = await provisionPilotOrganization(
      input,
      { dryRun: false },
      dependencies,
      now
    );

    expect(dependencies.createRecord).toHaveBeenCalledWith({
      ...input,
      tokenHash,
      expiresAt
    });
    expect(JSON.stringify(vi.mocked(dependencies.createRecord).mock.calls)).not.toContain(
      rawToken
    );
    expect(result).toEqual({
      dryRun: false,
      organization: {
        id: "organization-1",
        name: input.organizationName,
        slug: input.organizationSlug
      },
      owner: {
        id: "owner-1",
        name: input.ownerName,
        email: input.ownerEmail
      },
      setupPath: `/setup-account/${rawToken}`,
      expiresAt
    });
  });

  it("performs a read-only dry-run without generating a token", async () => {
    const dependencies = createDependencies();
    const result = await provisionPilotOrganization(
      input,
      { dryRun: true },
      dependencies,
      now
    );

    expect(result).toMatchObject({
      dryRun: true,
      setupPath: null,
      expiresAt: null
    });
    expect(dependencies.findConflicts).toHaveBeenCalledWith(input);
    expect(dependencies.createToken).not.toHaveBeenCalled();
    expect(dependencies.hashToken).not.toHaveBeenCalled();
    expect(dependencies.createRecord).not.toHaveBeenCalled();
  });

  it.each([
    ["organization_slug", PILOT_ORGANIZATION_SLUG_CONFLICT_MESSAGE],
    ["owner_email", PILOT_OWNER_EMAIL_CONFLICT_MESSAGE]
  ] as const)("maps %s conflicts to an operational message", async (conflict, message) => {
    const dependencies = createDependencies({
      createRecord: vi.fn(async () => {
        throw new PilotProvisioningConflictError(conflict);
      })
    });

    await expect(
      provisionPilotOrganization(input, { dryRun: false }, dependencies, now)
    ).rejects.toEqual(new ConflictError(message));
  });

  it("rejects invalid input before checking or writing the database", async () => {
    const dependencies = createDependencies();

    await expect(
      provisionPilotOrganization(
        {
          ...input,
          organizationSlug: "INVALID"
        },
        { dryRun: false },
        dependencies,
        now
      )
    ).rejects.toBeInstanceOf(ValidationError);
    expect(dependencies.findConflicts).not.toHaveBeenCalled();
    expect(dependencies.createRecord).not.toHaveBeenCalled();
  });
});
