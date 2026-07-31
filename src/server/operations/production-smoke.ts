export type SmokeFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export type ProductionSmokeResult = {
  baseUrl: string;
  checks: string[];
};

export class ProductionSmokeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionSmokeError";
  }
}

const internalDetailPatterns = [
  /DATABASE_URL/i,
  /postgres(?:ql)?:\/\//i,
  /PrismaClient/i,
  /node_modules[\\/]/i,
  /passwordHash/i,
  /tokenHash/i,
  /\bat\s+\S+\s+\([^)]+:\d+:\d+\)/
];

export function parseSmokeBaseUrl(
  args: string[],
  env = process.env
): URL {
  let rawValue = env.FIXFLOW_SMOKE_BASE_URL?.trim() ?? "";

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--base-url") {
      rawValue = args[index + 1]?.trim() ?? "";
      index += 1;
      continue;
    }

    if (argument.startsWith("--base-url=")) {
      rawValue = argument.slice("--base-url=".length).trim();
      continue;
    }

    throw new ProductionSmokeError(
      "Only --base-url is supported by the production smoke check."
    );
  }

  if (!rawValue) {
    throw new ProductionSmokeError(
      "Configure FIXFLOW_SMOKE_BASE_URL or pass --base-url."
    );
  }

  let baseUrl: URL;

  try {
    baseUrl = new URL(rawValue);
  } catch {
    throw new ProductionSmokeError("The smoke base URL is invalid.");
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new ProductionSmokeError(
      "The smoke base URL must use HTTP or HTTPS."
    );
  }

  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new ProductionSmokeError(
      "The smoke base URL must not contain credentials, query parameters or fragments."
    );
  }

  baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, "") || "/";

  return baseUrl;
}

function assertNoInternalDetails(body: string, route: string): void {
  if (internalDetailPatterns.some((pattern) => pattern.test(body))) {
    throw new ProductionSmokeError(
      `The ${route} response exposed internal implementation details.`
    );
  }
}

async function readBody(response: Response, route: string): Promise<string> {
  const body = await response.text();
  assertNoInternalDetails(body, route);
  return body;
}

function assertSecurityHeaders(response: Response, https: boolean): void {
  const requiredHeaders = [
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy"
  ];

  for (const header of requiredHeaders) {
    if (!response.headers.get(header)) {
      throw new ProductionSmokeError(
        `A required security header is missing: ${header}.`
      );
    }
  }

  if (https && !response.headers.get("strict-transport-security")) {
    throw new ProductionSmokeError(
      "Strict-Transport-Security is missing on the HTTPS target."
    );
  }
}

async function request(
  fetchImplementation: SmokeFetch,
  baseUrl: URL,
  route: string,
  redirect: RequestRedirect = "follow"
): Promise<Response> {
  try {
    return await fetchImplementation(new URL(route, baseUrl), {
      method: "GET",
      redirect,
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: route.startsWith("/api/") ? "application/json" : "text/html"
      }
    });
  } catch {
    throw new ProductionSmokeError(`The ${route} request failed.`);
  }
}

export async function runProductionSmoke(
  baseUrl: URL,
  fetchImplementation: SmokeFetch = fetch
): Promise<ProductionSmokeResult> {
  const live = await request(
    fetchImplementation,
    baseUrl,
    "/api/health/live"
  );
  const liveBody = await readBody(live, "/api/health/live");

  if (!live.ok) {
    throw new ProductionSmokeError("Liveness did not return HTTP 2xx.");
  }

  let livePayload: unknown;

  try {
    livePayload = JSON.parse(liveBody);
  } catch {
    throw new ProductionSmokeError("Liveness did not return valid JSON.");
  }

  if (
    typeof livePayload !== "object" ||
    livePayload === null ||
    !("status" in livePayload) ||
    livePayload.status !== "ok" ||
    !("release" in livePayload) ||
    typeof livePayload.release !== "string"
  ) {
    throw new ProductionSmokeError(
      "Liveness did not return the expected safe release identity."
    );
  }

  const ready = await request(
    fetchImplementation,
    baseUrl,
    "/api/health/ready"
  );
  const readyBody = await readBody(ready, "/api/health/ready");

  if (!ready.ok) {
    throw new ProductionSmokeError("Readiness did not return HTTP 2xx.");
  }

  try {
    const readyPayload = JSON.parse(readyBody) as { status?: unknown };

    if (readyPayload.status !== "ready") {
      throw new Error("not ready");
    }
  } catch {
    throw new ProductionSmokeError(
      "Readiness did not return the expected safe payload."
    );
  }

  const home = await request(fetchImplementation, baseUrl, "/");
  const homeBody = await readBody(home, "/");

  if (!home.ok || !homeBody.includes("FixFlow")) {
    throw new ProductionSmokeError("The public home page is unavailable.");
  }
  assertSecurityHeaders(home, baseUrl.protocol === "https:");

  const login = await request(fetchImplementation, baseUrl, "/login");
  const loginBody = await readBody(login, "/login");

  if (!login.ok || !loginBody.includes("Acesso interno")) {
    throw new ProductionSmokeError("The login page is unavailable.");
  }

  const protectedApp = await request(
    fetchImplementation,
    baseUrl,
    "/app",
    "manual"
  );
  await readBody(protectedApp, "/app");
  const redirectLocation = protectedApp.headers.get("location");

  if (
    ![302, 303, 307, 308].includes(protectedApp.status) ||
    !redirectLocation ||
    new URL(redirectLocation, baseUrl).pathname !== "/login"
  ) {
    throw new ProductionSmokeError(
      "The protected application did not redirect an anonymous request to login."
    );
  }

  return {
    baseUrl: baseUrl.origin,
    checks: [
      "liveness",
      "readiness",
      "home",
      "login",
      "protected_redirect",
      "security_headers",
      "safe_responses"
    ]
  };
}
