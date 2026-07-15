import { createHash } from "node:crypto";

export function hashSecurityValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
