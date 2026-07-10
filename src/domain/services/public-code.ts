import { randomInt } from "node:crypto";

export const SERVICE_ORDER_PUBLIC_CODE_PREFIX = "FF";
export const SERVICE_ORDER_PUBLIC_CODE_LENGTH = 10;

const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_CODE_PATTERN = /^FF-[A-HJ-NP-Z2-9]{10}$/;

export function createServiceOrderPublicCode(): string {
  const code = Array.from({ length: SERVICE_ORDER_PUBLIC_CODE_LENGTH }, () => {
    return PUBLIC_CODE_ALPHABET[randomInt(PUBLIC_CODE_ALPHABET.length)];
  }).join("");

  return `${SERVICE_ORDER_PUBLIC_CODE_PREFIX}-${code}`;
}

export function isServiceOrderPublicCode(value: string): boolean {
  return PUBLIC_CODE_PATTERN.test(value);
}
