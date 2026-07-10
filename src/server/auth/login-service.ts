import {
  AuthenticationError,
  INVALID_CREDENTIALS_MESSAGE
} from "@/domain/errors/authentication-error";
import { normalizeEmail } from "@/domain/services/email";
import { validatePassword } from "@/domain/services/password-policy";
import { createAuthSession } from "@/server/auth/session-service";
import { verifyPassword } from "@/server/auth/password";
import {
  findUserByEmailForAuthentication,
  type AuthUserForLogin
} from "@/server/repositories/auth-user-repository";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  sessionToken: string;
  expiresAt: Date;
  user: {
    id: string;
    organizationId: string;
    name: string;
    email: string;
    role: AuthUserForLogin["role"];
  };
};

export type LoginServiceDependencies = {
  findUserByEmail(normalizedEmail: string): Promise<AuthUserForLogin | null>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  createSession(userId: string): Promise<{
    sessionToken: string;
    expiresAt: Date;
  }>;
};

const defaultLoginDependencies: LoginServiceDependencies = {
  findUserByEmail: findUserByEmailForAuthentication,
  verifyPassword,
  createSession: createAuthSession
};

function createInvalidCredentialsError(): AuthenticationError {
  return new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
}

export async function loginWithEmailAndPassword(
  input: LoginInput,
  dependencies = defaultLoginDependencies
): Promise<LoginResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const passwordValidation = validatePassword(input.password);

  if (!normalizedEmail || !passwordValidation.valid) {
    throw createInvalidCredentialsError();
  }

  const user = await dependencies.findUserByEmail(normalizedEmail);

  if (!user) {
    throw createInvalidCredentialsError();
  }

  const passwordMatches = await dependencies.verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw createInvalidCredentialsError();
  }

  const session = await dependencies.createSession(user.id);

  return {
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}
