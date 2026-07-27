import { normalizeEmail } from "@/domain/services/email";
import { normalizeServiceOrderPublicCode } from "@/domain/services/public-code";
import {
  hashAccountSetupToken,
  isAccountSetupTokenFormatValid
} from "@/server/auth/account-setup-token";
import { hashSecurityValue } from "@/server/security/security-hash";

export type SecuritySubject = {
  subjectHash: string;
};

export function createLoginSecuritySubject(emailInput: string): SecuritySubject {
  const normalizedEmail = normalizeEmail(emailInput) || "invalid-email";

  return {
    subjectHash: hashSecurityValue(normalizedEmail)
  };
}

export function createPublicCodeSecuritySubject(
  publicCodeInput: string
): SecuritySubject {
  const normalizedPublicCode =
    normalizeServiceOrderPublicCode(publicCodeInput) ?? "invalid-public-code";

  return {
    subjectHash: hashSecurityValue(normalizedPublicCode)
  };
}

export function createAccountSetupSecuritySubject(
  tokenInput: string
): SecuritySubject {
  return {
    subjectHash: isAccountSetupTokenFormatValid(tokenInput)
      ? hashAccountSetupToken(tokenInput)
      : hashSecurityValue("invalid-account-setup-token")
  };
}
