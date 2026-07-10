import { NextResponse } from "next/server";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { requireCurrentUser } from "@/server/auth/authenticated-context";

export async function GET() {
  try {
    const currentUser = await requireCurrentUser();

    return NextResponse.json(
      {
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role
        },
        organization: {
          id: currentUser.organization.id,
          name: currentUser.organization.name,
          slug: currentUser.organization.slug
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
