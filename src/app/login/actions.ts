"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AuthenticationError,
  INVALID_CREDENTIALS_MESSAGE
} from "@/domain/errors/authentication-error";
import { loginWithEmailAndPassword } from "@/server/auth/login-service";
import {
  AUTH_SESSION_COOKIE_NAME,
  getSessionCookieOptions
} from "@/server/auth/session-cookie";

export type LoginActionState = {
  error?: string;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  try {
    const result = await loginWithEmailAndPassword({
      email: getStringFormValue(formData, "email"),
      password: getStringFormValue(formData, "password")
    });

    const cookieStore = await cookies();

    cookieStore.set(
      AUTH_SESSION_COOKIE_NAME,
      result.sessionToken,
      getSessionCookieOptions(result.expiresAt)
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return {
        error: INVALID_CREDENTIALS_MESSAGE
      };
    }

    throw error;
  }

  redirect("/app");
}
