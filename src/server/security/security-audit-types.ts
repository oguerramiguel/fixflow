export const securityAuditEventTypes = {
  loginSucceeded: "LOGIN_SUCCEEDED",
  loginRejected: "LOGIN_REJECTED",
  logout: "LOGOUT",
  rateLimitBlocked: "RATE_LIMIT_BLOCKED",
  publicQuoteApproved: "PUBLIC_QUOTE_APPROVED",
  publicQuoteRejected: "PUBLIC_QUOTE_REJECTED"
} as const;

export type SecurityAuditEventType =
  (typeof securityAuditEventTypes)[keyof typeof securityAuditEventTypes];

export const securityAuditOutcomes = {
  success: "SUCCESS",
  failure: "FAILURE",
  blocked: "BLOCKED"
} as const;

export type SecurityAuditOutcome =
  (typeof securityAuditOutcomes)[keyof typeof securityAuditOutcomes];
