import { prisma } from "../db/prisma";
import {
  getRuntimeConfig,
  getRuntimeReleaseIdentity
} from "../runtime/runtime-config";

type HealthIdentity = {
  version: string;
  release: string;
};

export type LivenessResult = HealthIdentity & {
  status: "ok";
};

export type ReadinessResult =
  | (HealthIdentity & {
      status: "ready";
    })
  | (HealthIdentity & {
      status: "unavailable";
    });

export type ReadinessDependencies = {
  getTimeoutMs(): number;
  getIdentity(): HealthIdentity;
  checkDatabase(): Promise<void>;
};

const defaultReadinessDependencies: ReadinessDependencies = {
  getTimeoutMs: () => getRuntimeConfig().readinessTimeoutMs,
  getIdentity: () => getRuntimeReleaseIdentity(),
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  }
};

class ReadinessTimeoutError extends Error {
  constructor() {
    super("Readiness check timed out.");
    this.name = "ReadinessTimeoutError";
  }
}

export function getLiveness(
  env = process.env
): LivenessResult {
  return {
    status: "ok",
    ...getRuntimeReleaseIdentity(env)
  };
}

export async function getReadiness(
  dependencies = defaultReadinessDependencies
): Promise<ReadinessResult> {
  const identity = dependencies.getIdentity();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      dependencies.checkDatabase(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new ReadinessTimeoutError()),
          dependencies.getTimeoutMs()
        );
      })
    ]);

    return {
      status: "ready",
      ...identity
    };
  } catch {
    return {
      status: "unavailable",
      ...identity
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
