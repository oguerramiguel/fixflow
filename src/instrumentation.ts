export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getRuntimeConfig, getPublicReleaseIdentity } = await import(
      "./server/runtime/runtime-config"
    );
    const config = getRuntimeConfig();
    const identity = getPublicReleaseIdentity(config);

    console.info("FixFlow runtime configuration validated.", {
      environment: config.environment,
      version: identity.version,
      release: identity.release
    });
  }
}
