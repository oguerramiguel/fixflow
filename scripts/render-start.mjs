const releaseSha = process.env.FIXFLOW_RELEASE_SHA?.trim() ||
  process.env.RENDER_GIT_COMMIT?.trim();

if (!releaseSha) {
  throw new Error(
    "FIXFLOW_RELEASE_SHA or RENDER_GIT_COMMIT must identify the deployed release."
  );
}

process.env.FIXFLOW_RELEASE_SHA = releaseSha;

await import("../server.js");
