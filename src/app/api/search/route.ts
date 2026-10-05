import { NextResponse } from "next/server";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { ValidationError } from "@/domain/errors/validation-error";
import { requireAuthenticatedContext } from "@/server/auth/authenticated-context";
import { searchForOrganization } from "@/server/services/global-search-service";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const context = await requireAuthenticatedContext();
    const query = new URL(request.url).searchParams.get("query") ?? "";
    return NextResponse.json({ results: await searchForOrganization(context, query) }, { headers });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401, headers });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    }
    return NextResponse.json({ error: "Não foi possível buscar agora. Tente novamente." }, { status: 500, headers });
  }
}
