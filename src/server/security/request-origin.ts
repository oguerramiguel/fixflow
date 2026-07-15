import { headers } from "next/headers";
import { hashSecurityValue } from "@/server/security/security-hash";

export type SecurityRequestOriginInput = {
  forwardedFor?: string | null;
  realIp?: string | null;
  userAgent?: string | null;
};

export type SecurityRequestOrigin = {
  originHash: string;
  forwardedForHash?: string;
  userAgentHash?: string;
};

function normalizeHeaderValue(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue || null;
}

function getFirstForwardedAddress(value: string | null | undefined): string | null {
  const headerValue = normalizeHeaderValue(value);

  if (!headerValue) {
    return null;
  }

  return normalizeHeaderValue(headerValue.split(",")[0]);
}

export function createSecurityRequestOrigin(
  input: SecurityRequestOriginInput
): SecurityRequestOrigin {
  const forwardedAddress =
    getFirstForwardedAddress(input.forwardedFor) ??
    normalizeHeaderValue(input.realIp);
  const userAgent = normalizeHeaderValue(input.userAgent);
  const originBasis = [
    forwardedAddress ?? "unknown-address",
    userAgent ?? "unknown-user-agent"
  ].join("\n");

  return {
    originHash: hashSecurityValue(originBasis),
    forwardedForHash: forwardedAddress
      ? hashSecurityValue(forwardedAddress)
      : undefined,
    userAgentHash: userAgent ? hashSecurityValue(userAgent) : undefined
  };
}

export async function getSecurityRequestOrigin(): Promise<SecurityRequestOrigin> {
  const headerStore = await headers();

  return createSecurityRequestOrigin({
    forwardedFor: headerStore.get("x-forwarded-for"),
    realIp: headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent")
  });
}
