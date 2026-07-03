import { NextResponse } from "next/server";
import { isConfigured, BASE_URL } from "@/lib/client";

export const runtime = "nodejs";

// Lightweight configuration check for the UI's connectivity indicator.
// Returns only the host (never the key or full URL with any credentials).
export async function GET() {
  let host: string | null = null;
  try {
    host = BASE_URL ? new URL(BASE_URL).host : null;
  } catch {
    host = null;
  }
  return NextResponse.json({ configured: isConfigured(), host });
}
