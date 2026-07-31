import { NextResponse } from "next/server";
import { getReadiness } from "@/server/operations/health-service";

export async function GET() {
  const result = await getReadiness();

  return NextResponse.json(result, {
    status: result.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
