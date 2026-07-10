import {
  createAuthSessionRecord,
  deleteAuthSessionByTokenHash,
  findAuthSessionByTokenHash,
  type AuthSessionRecord
} from "@/server/repositories/auth-session-repository";
import { AUTH_SESSION_DURATION_MS } from "@/server/auth/session-cookie";
import {
  createSessionToken,
  hashSessionToken
} from "@/server/auth/session-token";

export type CreateAuthSessionResult = {
  sessionId: string;
  sessionToken: string;
  expiresAt: Date;
};

export type AuthSessionStore = {
  create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<AuthSessionRecord>;
  findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
};

const prismaAuthSessionStore: AuthSessionStore = {
  create: createAuthSessionRecord,
  findByTokenHash: findAuthSessionByTokenHash,
  deleteByTokenHash: deleteAuthSessionByTokenHash
};

export function calculateAuthSessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + AUTH_SESSION_DURATION_MS);
}

export async function createAuthSession(
  userId: string,
  store = prismaAuthSessionStore,
  now = new Date()
): Promise<CreateAuthSessionResult> {
  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = calculateAuthSessionExpiresAt(now);

  const session = await store.create({
    userId,
    tokenHash,
    expiresAt
  });

  return {
    sessionId: session.id,
    sessionToken,
    expiresAt: session.expiresAt
  };
}

export async function findValidAuthSessionByToken(
  sessionToken: string,
  store = prismaAuthSessionStore,
  now = new Date()
): Promise<AuthSessionRecord | null> {
  const tokenHash = hashSessionToken(sessionToken);
  const session = await store.findByTokenHash(tokenHash);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= now) {
    await store.deleteByTokenHash(tokenHash);
    return null;
  }

  return session;
}

export async function invalidateAuthSession(
  sessionToken: string,
  store = prismaAuthSessionStore
): Promise<void> {
  const tokenHash = hashSessionToken(sessionToken);

  await store.deleteByTokenHash(tokenHash);
}
