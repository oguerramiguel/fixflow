import { describe, expect, it, vi } from "vitest";
import {
  formatPilotProvisioningCommandError,
  PilotProvisioningCommandError,
  parsePilotProvisioningArguments,
  runPilotProvisioningCommand,
  type PilotProvisioningCommandDependencies
} from "@/server/operations/pilot-provisioning-command";
import type { PilotProvisioningResult } from "@/server/services/pilot-provisioning-service";

const rawToken = "c".repeat(43);
const argv = [
  "--organization-name",
  "Pilot Company",
  "--organization-slug",
  "pilot-company",
  "--owner-name",
  "Pilot Owner",
  "--owner-email",
  "owner@example.test"
];
const createdResult: PilotProvisioningResult = {
  dryRun: false,
  organization: {
    id: "organization-1",
    name: "Pilot Company",
    slug: "pilot-company"
  },
  owner: {
    id: "owner-1",
    name: "Pilot Owner",
    email: "owner@example.test"
  },
  setupPath: `/setup-account/${rawToken}`,
  expiresAt: new Date("2026-08-27T12:00:00.000Z")
};

function createDependencies(result = createdResult) {
  const output: string[] = [];
  const sensitiveOutput: string[] = [];
  const close = vi.fn();
  const dependencies: PilotProvisioningCommandDependencies = {
    provision: vi.fn(async () => result),
    getAppBaseUrl: vi.fn(() => new URL("https://staging.example.test")),
    createSensitiveTerminal: vi.fn(() => ({
      write: (value: string) => sensitiveOutput.push(value),
      close
    })),
    writeOutput: (value) => output.push(value)
  };

  return {
    dependencies,
    output,
    sensitiveOutput,
    close
  };
}

describe("pilot provisioning command", () => {
  it("parses the required administrative arguments", () => {
    expect(parsePilotProvisioningArguments([...argv, "--dry-run"])).toEqual({
      organizationName: "Pilot Company",
      organizationSlug: "pilot-company",
      ownerName: "Pilot Owner",
      ownerEmail: "owner@example.test",
      dryRun: true
    });
  });

  it("writes the complete setup link exactly once and only to the terminal", async () => {
    const { dependencies, output, sensitiveOutput, close } = createDependencies();

    await runPilotProvisioningCommand(argv, { NODE_ENV: "test" }, dependencies);

    expect(sensitiveOutput).toHaveLength(1);
    expect(sensitiveOutput[0]).toContain(
      `https://staging.example.test/setup-account/${rawToken}`
    );
    expect(sensitiveOutput[0]?.split(rawToken)).toHaveLength(2);
    expect(JSON.stringify(output)).not.toContain(rawToken);
    expect(close).toHaveBeenCalledOnce();
  });

  it("refuses a non-interactive run before creating database records", async () => {
    const dependencies = createDependencies().dependencies;
    dependencies.createSensitiveTerminal = vi.fn(() => {
      throw new PilotProvisioningCommandError("interactive terminal required");
    });

    await expect(
      runPilotProvisioningCommand(argv, { NODE_ENV: "test" }, dependencies)
    ).rejects.toThrow("interactive terminal required");
    expect(dependencies.provision).not.toHaveBeenCalled();
  });

  it("does not open a sensitive terminal during dry-run", async () => {
    const dryRunResult: PilotProvisioningResult = {
      ...createdResult,
      dryRun: true,
      organization: {
        ...createdResult.organization,
        id: null
      },
      owner: {
        ...createdResult.owner,
        id: null
      },
      setupPath: null,
      expiresAt: null
    };
    const { dependencies, output, sensitiveOutput } = createDependencies(dryRunResult);

    await runPilotProvisioningCommand(
      [...argv, "--dry-run"],
      { NODE_ENV: "test" },
      dependencies
    );

    expect(dependencies.createSensitiveTerminal).not.toHaveBeenCalled();
    expect(sensitiveOutput).toEqual([]);
    expect(output).toEqual(["Dry run passed. No records were written."]);
  });

  it("rejects missing, duplicate and unknown arguments", () => {
    expect(() => parsePilotProvisioningArguments([])).toThrow(
      "--organization-name is required"
    );
    expect(() =>
      parsePilotProvisioningArguments([...argv, "--owner-email", "other@example.test"])
    ).toThrow("--owner-email was provided twice");
    expect(() => parsePilotProvisioningArguments([...argv, "--organization-id", "x"])).toThrow(
      "Unknown provisioning argument"
    );
  });

  it("redacts unexpected error messages from command output", () => {
    expect(formatPilotProvisioningCommandError(new Error(rawToken))).toBe(
      "Pilot provisioning failed (Error). No credentials or tokens were printed."
    );
  });
});
