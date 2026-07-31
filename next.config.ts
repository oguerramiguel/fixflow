import type { NextConfig } from "next";
import { getHttpSecurityHeaders } from "./src/server/security/http-security-headers";

const configuredServerActionOrigins =
  process.env.FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: configuredServerActionOrigins?.length
    ? {
        serverActions: {
          allowedOrigins: configuredServerActionOrigins
        }
      }
    : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getHttpSecurityHeaders()
      }
    ];
  }
};

export default nextConfig;
