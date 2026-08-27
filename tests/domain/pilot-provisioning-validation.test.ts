import { describe, expect, it } from "vitest";
import { validatePilotProvisioningInput } from "@/domain/services/pilot-provisioning-validation";

describe("pilot provisioning validation", () => {
  it("trims names and slug and normalizes the OWNER email", () => {
    expect(
      validatePilotProvisioningInput({
        organizationName: "  Oficina Piloto  ",
        organizationSlug: "  oficina-piloto  ",
        ownerName: "  Owner Piloto  ",
        ownerEmail: "  OWNER@EXAMPLE.TEST  "
      })
    ).toEqual({
      valid: true,
      data: {
        organizationName: "Oficina Piloto",
        organizationSlug: "oficina-piloto",
        ownerName: "Owner Piloto",
        ownerEmail: "owner@example.test"
      }
    });
  });

  it("rejects malformed organization and OWNER fields", () => {
    const result = validatePilotProvisioningInput({
      organizationName: "x",
      organizationSlug: "Invalid Slug",
      ownerName: "x",
      ownerEmail: "invalid"
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.fieldErrors).toEqual({
        organizationName: expect.any(String),
        organizationSlug: expect.any(String),
        ownerName: expect.any(String),
        ownerEmail: expect.any(String)
      });
    }
  });

  it.each(["-pilot", "pilot-", "pilot--company", "Pilot", "pilot_company"])(
    "rejects unsafe slug %s",
    (organizationSlug) => {
      const result = validatePilotProvisioningInput({
        organizationName: "Pilot Company",
        organizationSlug,
        ownerName: "Pilot Owner",
        ownerEmail: "owner@example.test"
      });

      expect(result).toMatchObject({
        valid: false,
        fieldErrors: {
          organizationSlug: expect.any(String)
        }
      });
    }
  );
});
