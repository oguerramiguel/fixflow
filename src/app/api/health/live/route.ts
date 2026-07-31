import { NextResponse } from "next/server";
import { getLiveness } from "@/server/operations/health-service";

export function GET() {
  return NextResponse.json(getLiveness(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
