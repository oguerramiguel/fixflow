import type { UserRole } from "@prisma/client";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";

export function hasRole(
  context: AuthenticatedContext,
  allowedRoles: readonly UserRole[]
): boolean {
  return allowedRoles.includes(context.role);
}

export function requireRole(
  context: AuthenticatedContext,
  allowedRoles: readonly UserRole[]
): void {
  if (!hasRole(context, allowedRoles)) {
    throw new AuthorizationError();
  }
}
