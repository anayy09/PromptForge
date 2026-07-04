import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/client";

export const runtime = "nodejs";

// Lightweight configuration check for the UI's connectivity indicator.
// Deliberately returns only a boolean: the backend host, base URL, and key are
// never exposed to the client (the endpoint identity stays server-side).
export async function GET() {
  return NextResponse.json({ configured: isConfigured() });
}
