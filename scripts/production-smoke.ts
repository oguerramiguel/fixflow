import {
  parseSmokeBaseUrl,
  runProductionSmoke
} from "../src/server/operations/production-smoke";

async function main(): Promise<void> {
  const baseUrl = parseSmokeBaseUrl(process.argv.slice(2));
  const result = await runProductionSmoke(baseUrl);

  console.log(
    JSON.stringify(
      {
        operation: "production_smoke",
        status: "ok",
        baseUrl: result.baseUrl,
        checks: result.checks
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Production smoke check failed.", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    message:
      error instanceof Error
        ? error.message
        : "The production smoke check did not complete."
  });
  process.exitCode = 1;
});
