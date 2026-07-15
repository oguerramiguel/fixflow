import type { NextConfig } from "next";
import { getHttpSecurityHeaders } from "./src/server/security/http-security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
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
