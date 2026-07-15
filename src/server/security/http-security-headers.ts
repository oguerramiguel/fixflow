export type HttpSecurityHeader = {
  key: string;
  value: string;
};

function isProductionEnvironment(environment = process.env.NODE_ENV): boolean {
  return environment === "production";
}

export function createContentSecurityPolicy(
  environment = process.env.NODE_ENV
): string {
  const production = isProductionEnvironment(environment);
  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];

  if (!production) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:", "http://localhost:*", "http://127.0.0.1:*");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`
  ];

  if (production) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getHttpSecurityHeaders(
  environment = process.env.NODE_ENV
): HttpSecurityHeader[] {
  const headers: HttpSecurityHeader[] = [
    {
      key: "X-Content-Type-Options",
      value: "nosniff"
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin"
    },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()"
    },
    {
      key: "X-Frame-Options",
      value: "DENY"
    },
    {
      key: "Content-Security-Policy",
      value: createContentSecurityPolicy(environment)
    }
  ];

  if (isProductionEnvironment(environment)) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=15552000; includeSubDomains"
    });
  }

  return headers;
}
