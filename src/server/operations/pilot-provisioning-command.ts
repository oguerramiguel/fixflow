import { closeSync, openSync, writeSync } from "node:fs";
import { ConflictError } from "@/domain/errors/conflict-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { PilotProvisioningInput } from "@/domain/services/pilot-provisioning-validation";
import { RuntimeConfigurationError, getRuntimeConfig } from "@/server/runtime/runtime-config";
import {
  provisionPilotOrganization,
  type PilotProvisioningResult
} from "@/server/services/pilot-provisioning-service";

export class PilotProvisioningCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PilotProvisioningCommandError";
  }
}

export type PilotProvisioningCommandArguments = PilotProvisioningInput & {
  dryRun: boolean;
};

export type SensitiveTerminal = {
  write(value: string): void;
  close(): void;
};

export type PilotProvisioningCommandDependencies = {
  provision(
    input: PilotProvisioningInput,
    options: { dryRun: boolean }
  ): Promise<PilotProvisioningResult>;
  getAppBaseUrl(env: NodeJS.ProcessEnv): URL;
  createSensitiveTerminal(): SensitiveTerminal;
  writeOutput(value: string): void;
};

const argumentNames = {
  organizationName: "--organization-name",
  organizationSlug: "--organization-slug",
  ownerName: "--owner-name",
  ownerEmail: "--owner-email"
} as const;

function getRuntimeAppBaseUrl(env: NodeJS.ProcessEnv): URL {
  const releaseSha = env.FIXFLOW_RELEASE_SHA?.trim() ||
    env.RENDER_GIT_COMMIT?.trim();

  return getRuntimeConfig({
    ...env,
    ...(releaseSha ? { FIXFLOW_RELEASE_SHA: releaseSha } : {})
  }).appBaseUrl;
}

function createSensitiveTerminal(): SensitiveTerminal {
  const terminalPath = process.platform === "win32" ? "CONOUT$" : "/dev/tty";
  let descriptor: number;

  try {
    descriptor = openSync(terminalPath, "w");
  } catch {
    throw new PilotProvisioningCommandError(
      "Provisioning requires an interactive terminal so the setup link cannot be sent to service logs."
    );
  }

  let closed = false;

  return {
    write(value: string): void {
      if (closed) {
        throw new PilotProvisioningCommandError(
          "The secure terminal output is no longer available."
        );
      }

      writeSync(descriptor, `${value}\n`, undefined, "utf8");
    },
    close(): void {
      if (!closed) {
        closeSync(descriptor);
        closed = true;
      }
    }
  };
}

const defaultPilotProvisioningCommandDependencies: PilotProvisioningCommandDependencies =
  {
    provision: provisionPilotOrganization,
    getAppBaseUrl: getRuntimeAppBaseUrl,
    createSensitiveTerminal,
    writeOutput: (value) => console.log(value)
  };

function readArgumentValue(argv: string[], index: number, name: string): string {
  const value = argv[index + 1]?.trim();

  if (!value || value.startsWith("--")) {
    throw new PilotProvisioningCommandError(`${name} requires a value.`);
  }

  return value;
}

export function parsePilotProvisioningArguments(
  argv: string[]
): PilotProvisioningCommandArguments {
  const values: Partial<Record<keyof PilotProvisioningInput, string>> = {};
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    const entry = Object.entries(argumentNames).find(
      ([, name]) => name === argument
    );

    if (!entry) {
      throw new PilotProvisioningCommandError(
        `Unknown provisioning argument: ${argument ?? "<empty>"}.`
      );
    }

    const [field, name] = entry as [keyof PilotProvisioningInput, string];

    if (values[field] !== undefined) {
      throw new PilotProvisioningCommandError(`${name} was provided twice.`);
    }

    values[field] = readArgumentValue(argv, index, name);
    index += 1;
  }

  for (const [field, name] of Object.entries(argumentNames) as Array<
    [keyof PilotProvisioningInput, string]
  >) {
    if (values[field] === undefined) {
      throw new PilotProvisioningCommandError(`${name} is required.`);
    }
  }

  return {
    organizationName: values.organizationName as string,
    organizationSlug: values.organizationSlug as string,
    ownerName: values.ownerName as string,
    ownerEmail: values.ownerEmail as string,
    dryRun
  };
}

export async function runPilotProvisioningCommand(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  dependencies = defaultPilotProvisioningCommandDependencies
): Promise<PilotProvisioningResult> {
  const command = parsePilotProvisioningArguments(argv);
  const appBaseUrl = dependencies.getAppBaseUrl(env);
  const terminal = command.dryRun
    ? null
    : dependencies.createSensitiveTerminal();

  try {
    const result = await dependencies.provision(command, {
      dryRun: command.dryRun
    });

    if (result.dryRun) {
      dependencies.writeOutput("Dry run passed. No records were written.");
      return result;
    }

    if (!result.setupPath || !result.expiresAt || !terminal) {
      throw new PilotProvisioningCommandError(
        "Provisioning completed without a valid account setup invitation."
      );
    }

    dependencies.writeOutput(
      "Pilot Organization, OWNER and account setup invitation were created atomically."
    );
    dependencies.writeOutput(
      `Invitation expires at: ${result.expiresAt.toISOString()}`
    );
    terminal.write(
      `Account setup link (shown once): ${new URL(result.setupPath, appBaseUrl).toString()}`
    );

    return result;
  } finally {
    terminal?.close();
  }
}

export function formatPilotProvisioningCommandError(error: unknown): string {
  if (
    error instanceof PilotProvisioningCommandError ||
    error instanceof RuntimeConfigurationError ||
    error instanceof ConflictError ||
    error instanceof ValidationError
  ) {
    return error.message;
  }

  const errorName = error instanceof Error ? error.name : "UnknownError";

  return `Pilot provisioning failed (${errorName}). No credentials or tokens were printed.`;
}
