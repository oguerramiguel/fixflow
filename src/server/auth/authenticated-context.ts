import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { AUTH_SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";
import { findValidAuthSessionByToken } from "@/server/auth/session-service";
import {
  findAuthenticatableUserById,
  findCurrentUserById,
  type AuthenticatedContextUserRecord,
  type CurrentUserRecord
} from "@/server/repositories/auth-user-repository";
import {
  createTenantContext,
  type TenantContext
} from "@/server/repositories/tenant-context";

export type AuthenticatedContext = TenantContext & {
  userId: string;
  role: UserRole;
};

export type CurrentAuthenticatedUser = CurrentUserRecord;

export type AuthenticatedContextDependencies = {
  findValidSessionByToken(sessionToken: string): Promise<{
    userId: string;
  } | null>;
  findUserById(
    userId: string
  ): Promise<AuthenticatedContextUserRecord | null>;
};

export type CurrentUserDependencies = {
  findValidSessionByToken(sessionToken: string): Promise<{
    userId: string;
  } | null>;
  findCurrentUserById(userId: string): Promise<CurrentUserRecord | null>;
};

const defaultAuthenticatedContextDependencies: AuthenticatedContextDependencies =
  {
    findValidSessionByToken: findValidAuthSessionByToken,
    findUserById: findAuthenticatableUserById
  };

const defaultCurrentUserDependencies: CurrentUserDependencies = {
  findValidSessionByToken: findValidAuthSessionByToken,
  findCurrentUserById
};

export function createAuthenticatedContext(
  user: AuthenticatedContextUserRecord
): AuthenticatedContext {
  const tenantContext = createTenantContext(user.organizationId);

  return {
    userId: user.id,
    organizationId: tenantContext.organizationId,
    role: user.role
  };
}

export async function resolveAuthenticatedContextFromSessionToken(
  sessionToken: string | undefined,
  dependencies = defaultAuthenticatedContextDependencies
): Promise<AuthenticatedContext> {
  if (!sessionToken) {
    throw new AuthenticationError();
  }

  const session = await dependencies.findValidSessionByToken(sessionToken);

  if (!session) {
    throw new AuthenticationError();
  }

  const user = await dependencies.findUserById(session.userId);

  if (!user) {
    throw new AuthenticationError();
  }

  return createAuthenticatedContext(user);
}

export async function resolveCurrentUserFromSessionToken(
  sessionToken: string | undefined,
  dependencies = defaultCurrentUserDependencies
): Promise<CurrentAuthenticatedUser> {
  if (!sessionToken) {
    throw new AuthenticationError();
  }

  const session = await dependencies.findValidSessionByToken(sessionToken);

  if (!session) {
    throw new AuthenticationError();
  }

  const user = await dependencies.findCurrentUserById(session.userId);

  if (!user) {
    throw new AuthenticationError();
  }

  return user;
}

async function readSessionTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();

  return cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
}

export async function requireAuthenticatedContext(): Promise<AuthenticatedContext> {
  const sessionToken = await readSessionTokenFromCookie();

  return resolveAuthenticatedContextFromSessionToken(sessionToken);
}

export async function requireCurrentUser(): Promise<CurrentAuthenticatedUser> {
  const sessionToken = await readSessionTokenFromCookie();

  return resolveCurrentUserFromSessionToken(sessionToken);
}

export async function getOptionalCurrentUser(): Promise<CurrentAuthenticatedUser | null> {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return null;
    }

    throw error;
  }
}
