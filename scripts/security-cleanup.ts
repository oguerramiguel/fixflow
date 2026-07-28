import { prisma } from "../src/server/db/prisma";
import { runSecurityCleanup } from "../src/server/security/security-cleanup-service";

function readDryRunArgument(args: string[]): boolean {
  const unsupportedArguments = args.filter((argument) => argument !== "--dry-run");

  if (unsupportedArguments.length > 0) {
    throw new Error(
      `Unsupported security cleanup argument: ${unsupportedArguments[0]}`
    );
  }

  return args.includes("--dry-run");
}

async function main(): Promise<void> {
  const dryRun = readDryRunArgument(process.argv.slice(2));
  const result = await runSecurityCleanup({
    dryRun
  });

  console.log(
    JSON.stringify(
      {
        operation: "security_cleanup",
        dryRun: result.dryRun,
        batchSize: result.batchSize,
        counts: result.counts
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Security cleanup failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
