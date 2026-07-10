export const AUTH_SESSION_COOKIE_NAME = "fixflow_session";
export const AUTH_SESSION_DURATION_DAYS = 7;
export const AUTH_SESSION_DURATION_SECONDS =
  AUTH_SESSION_DURATION_DAYS * 24 * 60 * 60;
export const AUTH_SESSION_DURATION_MS = AUTH_SESSION_DURATION_SECONDS * 1000;

type AuthSessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
  expires?: Date;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSessionCookieOptions(
  expiresAt: Date
): AuthSessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction(),
    maxAge: AUTH_SESSION_DURATION_SECONDS,
    expires: expiresAt
  };
}

export function getExpiredSessionCookieOptions(): AuthSessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction(),
    maxAge: 0,
    expires: new Date(0)
  };
}
