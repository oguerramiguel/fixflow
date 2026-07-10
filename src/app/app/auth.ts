import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import {
  requireAuthenticatedContext,
  requireCurrentUser,
  type AuthenticatedContext,
  type CurrentAuthenticatedUser
} from "@/server/auth/authenticated-context";

export async function requireAuthenticatedContextOrRedirect(): Promise<AuthenticatedContext> {
  try {
    return await requireAuthenticatedContext();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    throw error;
  }
}

export async function requireCurrentUserOrRedirect(): Promise<CurrentAuthenticatedUser> {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    throw error;
  }
}
