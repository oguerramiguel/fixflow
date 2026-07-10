"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { invalidateAuthSession } from "@/server/auth/session-service";
import {
  AUTH_SESSION_COOKIE_NAME,
  getExpiredSessionCookieOptions
} from "@/server/auth/session-cookie";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await invalidateAuthSession(sessionToken);
  }

  cookieStore.set(
    AUTH_SESSION_COOKIE_NAME,
    "",
    getExpiredSessionCookieOptions()
  );

  redirect("/login");
}
