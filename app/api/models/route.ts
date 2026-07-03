import { NextResponse } from "next/server";
import { getAll, getRewriters } from "@/lib/registry";

export const runtime = "nodejs";

// Serves the registry to the client. No secrets involved; the data is static.
export async function GET() {
  return NextResponse.json({
    models: getAll(),
    rewriterIds: getRewriters().map((m) => m.id),
  });
}
